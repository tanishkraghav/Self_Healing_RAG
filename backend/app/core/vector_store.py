import os
import uuid
from typing import List, Dict, Any
from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain.schema import Document
from app.core.config import settings


class VectorStoreManager:
    def __init__(self):
        # 100% free local embeddings — runs on CPU, no API key needed
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )
        os.makedirs(settings.chroma_persist_dir, exist_ok=True)
        self.vectorstore = Chroma(
            collection_name="self_healing_rag",
            embedding_function=self.embeddings,
            persist_directory=settings.chroma_persist_dir,
        )

    def add_documents(self, file_path: str, filename: str) -> Dict[str, Any]:
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
        else:
            loader = TextLoader(file_path, encoding="utf-8")

        raw_docs = loader.load()
        chunks = self.text_splitter.split_documents(raw_docs)

        doc_id = str(uuid.uuid4())
        for chunk in chunks:
            chunk.metadata["doc_id"] = doc_id
            chunk.metadata["filename"] = filename

        self.vectorstore.add_documents(chunks)

        return {
            "doc_id": doc_id,
            "filename": filename,
            "chunks": len(chunks),
            "pages": len(raw_docs),
        }

    def retrieve(self, query: str, k: int = None) -> List[Document]:
        k = k or settings.retrieval_k
        retriever = self.vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": k, "fetch_k": k * 2},
        )
        return retriever.invoke(query)

    def get_collection_stats(self) -> Dict[str, Any]:
        collection = self.vectorstore._collection
        count = collection.count()
        docs = collection.get(limit=1000)
        filenames = list(set(
            m.get("filename", "unknown")
            for m in (docs.get("metadatas") or [])
        ))
        return {"total_chunks": count, "documents": filenames}

    def delete_document(self, filename: str) -> bool:
        collection = self.vectorstore._collection
        results = collection.get(where={"filename": filename})
        if results["ids"]:
            collection.delete(ids=results["ids"])
            return True
        return False


vector_store = VectorStoreManager()
