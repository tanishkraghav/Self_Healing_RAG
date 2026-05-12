"""
Self-Healing RAG Pipeline using LangGraph.

State machine:
  retrieve → generate → critique → [PASS: respond] | [FAIL: reformulate → retrieve]
                                                   | [EXHAUSTED: graceful_fallback]
"""
from __future__ import annotations

import json
from typing import TypedDict, List, Annotated
from langchain.schema import Document
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
import operator

from app.core.config import settings
from app.core.vector_store import vector_store


# ─── State ────────────────────────────────────────────────────────────────────

class PipelineTrace(TypedDict):
    node: str
    detail: str


class RAGState(TypedDict):
    # Input
    original_query: str
    current_query: str

    # Retrieved context
    documents: List[Document]

    # Generation
    answer: str

    # Critic feedback
    critic_score: float
    critic_reasoning: str
    critic_passed: bool

    # Control
    retry_count: int
    max_retries: int
    is_exhausted: bool

    # Trace for frontend
    trace: Annotated[List[PipelineTrace], operator.add]


# ─── LLM instances ────────────────────────────────────────────────────────────
# Both free on Groq's generous free tier (console.groq.com)

llm = ChatGroq(
    model=settings.groq_model,
    groq_api_key=settings.groq_api_key,
    temperature=0.2,
)

critic_llm = ChatGroq(
    model=settings.groq_critic_model,   # critic model for structured JSON output
    groq_api_key=settings.groq_api_key,
    temperature=0.0,
)


# ─── Prompts ──────────────────────────────────────────────────────────────────

GENERATE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a precise, grounded assistant. Answer the question using ONLY the provided context.
If the context does not contain enough information, say exactly: "INSUFFICIENT_CONTEXT"
Do not hallucinate. Do not add information beyond what is in the context.
Be concise and cite which part of the context supports your answer."""),
    ("human", """Context:
{context}

Question: {question}

Answer:"""),
])

CRITIC_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a strict hallucination critic. Evaluate if the answer is FULLY grounded in the provided context.

Respond ONLY with valid JSON in this exact format:
{{
  "score": <float 0.0-1.0>,
  "reasoning": "<one sentence explanation>",
  "issues": ["<issue1>", "<issue2>"],
  "verdict": "<PASS or FAIL>"
}}

Scoring:
- 1.0: Every claim is directly supported by context
- 0.7-0.9: Mostly grounded with minor inference
- 0.4-0.6: Some claims unsupported  
- 0.0-0.3: Significant hallucination or context mismatch"""),
    ("human", """Context chunks:
{context}

Question: {question}

Answer to evaluate: {answer}

JSON evaluation:"""),
])

REFORMULATE_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a query optimization expert. Given a failed RAG query and critic feedback,
rewrite the query to be more specific, use different keywords, and target the missing information.
Return ONLY the reformulated query, nothing else."""),
    ("human", """Original query: {original_query}
Current query: {current_query}
Critic feedback: {critic_reasoning}
Retry number: {retry_count}

Reformulated query:"""),
])


# ─── Node functions ───────────────────────────────────────────────────────────

def retrieve_node(state: RAGState) -> dict:
    query = state["current_query"]
    docs = vector_store.retrieve(query)
    return {
        "documents": docs,
        "trace": [{"node": "retrieve", "detail": f"Retrieved {len(docs)} chunks for: \"{query}\""}],
    }


def generate_node(state: RAGState) -> dict:
    context = "\n\n---\n\n".join(
        f"[Chunk {i+1}] {doc.page_content}"
        for i, doc in enumerate(state["documents"])
    )
    chain = GENERATE_PROMPT | llm
    response = chain.invoke({
        "context": context,
        "question": state["current_query"],
    })
    answer = response.content.strip()
    return {
        "answer": answer,
        "trace": [{"node": "generate", "detail": f"Generated answer ({len(answer)} chars)"}],
    }


def critique_node(state: RAGState) -> dict:
    context = "\n\n---\n\n".join(
        f"[Chunk {i+1}] {doc.page_content}"
        for i, doc in enumerate(state["documents"])
    )
    chain = CRITIC_PROMPT | critic_llm
    response = chain.invoke({
        "context": context,
        "question": state["current_query"],
        "answer": state["answer"],
    })

    try:
        raw = response.content.strip()
        # strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        evaluation = json.loads(raw.strip())
        score = float(evaluation.get("score", 0.0))
        reasoning = evaluation.get("reasoning", "")
        verdict = evaluation.get("verdict", "FAIL")
        passed = verdict == "PASS" and score >= settings.critic_threshold
    except Exception:
        score = 0.0
        reasoning = "Failed to parse critic response"
        passed = False

    return {
        "critic_score": score,
        "critic_reasoning": reasoning,
        "critic_passed": passed,
        "trace": [{
            "node": "critique",
            "detail": f"Score: {score:.2f} | {'✓ PASS' if passed else '✗ FAIL'} | {reasoning}",
        }],
    }


def reformulate_node(state: RAGState) -> dict:
    chain = REFORMULATE_PROMPT | llm
    response = chain.invoke({
        "original_query": state["original_query"],
        "current_query": state["current_query"],
        "critic_reasoning": state["critic_reasoning"],
        "retry_count": state["retry_count"],
    })
    new_query = response.content.strip()
    new_retry = state["retry_count"] + 1
    exhausted = new_retry >= state["max_retries"]
    return {
        "current_query": new_query,
        "retry_count": new_retry,
        "is_exhausted": exhausted,
        "trace": [{
            "node": "reformulate",
            "detail": f"Retry {new_retry}/{state['max_retries']}: \"{new_query}\"",
        }],
    }


def graceful_fallback_node(state: RAGState) -> dict:
    answer = (
        "I was unable to find a sufficiently grounded answer in the available documents. "
        "The retrieved context did not contain enough information to answer your question reliably. "
        "Please try uploading more relevant documents or rephrasing your question."
    )
    return {
        "answer": answer,
        "trace": [{"node": "fallback", "detail": "Max retries exhausted — returning graceful fallback"}],
    }


# ─── Routing ──────────────────────────────────────────────────────────────────

def route_after_critique(state: RAGState) -> str:
    if state["answer"] == "INSUFFICIENT_CONTEXT":
        if state["retry_count"] >= state["max_retries"]:
            return "fallback"
        return "reformulate"
    if state["critic_passed"]:
        return END
    if state["retry_count"] >= state["max_retries"]:
        return "fallback"
    return "reformulate"


def route_after_reformulate(state: RAGState) -> str:
    if state["is_exhausted"]:
        return "fallback"
    return "retrieve"


# ─── Graph ────────────────────────────────────────────────────────────────────

def build_graph() -> StateGraph:
    graph = StateGraph(RAGState)

    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)
    graph.add_node("critique", critique_node)
    graph.add_node("reformulate", reformulate_node)
    graph.add_node("fallback", graceful_fallback_node)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", "critique")

    graph.add_conditional_edges(
        "critique",
        route_after_critique,
        {END: END, "reformulate": "reformulate", "fallback": "fallback"},
    )
    graph.add_conditional_edges(
        "reformulate",
        route_after_reformulate,
        {"retrieve": "retrieve", "fallback": "fallback"},
    )
    graph.add_edge("fallback", END)

    return graph.compile()


rag_graph = build_graph()


# ─── Public runner ────────────────────────────────────────────────────────────

def run_pipeline(query: str) -> dict:
    initial_state: RAGState = {
        "original_query": query,
        "current_query": query,
        "documents": [],
        "answer": "",
        "critic_score": 0.0,
        "critic_reasoning": "",
        "critic_passed": False,
        "retry_count": 0,
        "max_retries": settings.max_retries,
        "is_exhausted": False,
        "trace": [{"node": "start", "detail": f"Query received: \"{query}\""}],
    }

    final_state = rag_graph.invoke(initial_state)

    return {
        "query": query,
        "answer": final_state["answer"],
        "critic_score": final_state["critic_score"],
        "critic_reasoning": final_state["critic_reasoning"],
        "critic_passed": final_state["critic_passed"],
        "retries": final_state["retry_count"],
        "is_fallback": final_state["is_exhausted"] or final_state["answer"].startswith("I was unable"),
        "trace": final_state["trace"],
        "sources": [
            {
                "content": doc.page_content[:300],
                "metadata": doc.metadata,
            }
            for doc in final_state["documents"]
        ],
    }
