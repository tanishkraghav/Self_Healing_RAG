import React, { useState, useEffect, useRef, useCallback } from 'react'
import { queryDocuments, listDocuments, getHealth } from './utils/api'
import PipelineTrace from './components/PipelineTrace'
import CriticPanel from './components/CriticPanel'
import SourcesPanel from './components/SourcesPanel'
import DocumentUploader from './components/DocumentUploader'
import QueryHistory from './components/QueryHistory'

const TABS = ['TRACE', 'SOURCES', 'ANSWER']
const LEFT_TABS = ['DOCUMENTS', 'HISTORY']

function Panel({ title, children, style }) {
  return (
    <div style={{
      background: 'var(--bg-deep)',
      border: '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      ...style,
    }}>
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid var(--border-dim)',
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--text-dim)',
        letterSpacing: '0.1em',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexShrink: 0,
      }}>
        <span style={{ color: 'var(--acid-green)', fontSize: '8px' }}>◈</span>
        {title}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function StatusDot({ healthy }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: healthy ? 'var(--acid-green)' : 'var(--red-err)',
        animation: healthy ? 'pulse-glow 2s ease infinite' : 'none',
      }} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
        {healthy === null ? 'connecting' : healthy ? 'online' : 'offline'}
      </span>
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [activeHistory, setActiveHistory] = useState(null)
  const [documents, setDocuments] = useState([])
  const [health, setHealth] = useState(null)
  const [activeTab, setActiveTab] = useState('TRACE')
  const [leftTab, setLeftTab] = useState('DOCUMENTS')
  const textareaRef = useRef(null)

  const loadDocuments = useCallback(async () => {
    try {
      const stats = await listDocuments()
      setDocuments(stats.documents || [])
    } catch { /* backend offline */ }
  }, [])

  useEffect(() => {
    loadDocuments()
    getHealth().then(h => setHealth(h)).catch(() => setHealth(null))
    const interval = setInterval(() => {
      getHealth().then(h => setHealth(h)).catch(() => setHealth(null))
    }, 30000)
    return () => clearInterval(interval)
  }, [loadDocuments])

  const displayResult = result || (activeHistory !== null ? history[activeHistory] : null)

  const handleSubmit = async () => {
    if (!query.trim() || isLoading) return
    setIsLoading(true)
    setResult(null)
    setActiveHistory(null)
    setActiveTab('TRACE')

    try {
      const data = await queryDocuments(query.trim())
      setResult(data)
      setHistory(prev => [...prev, data])
    } catch (err) {
      setResult({
        query: query.trim(),
        answer: `Error: ${err.response?.data?.detail || err.message}`,
        critic_score: 0,
        critic_reasoning: 'Request failed',
        critic_passed: false,
        retries: 0,
        is_fallback: true,
        trace: [{ node: 'start', detail: `Query: ${query.trim()}` }, { node: 'fallback', detail: err.message }],
        sources: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
  }

  const handleHistorySelect = (i) => {
    setActiveHistory(i)
    setResult(null)
    setActiveTab('TRACE')
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-void)',
    }}>
      {/* Top bar */}
      <header style={{
        height: '48px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: '16px',
        flexShrink: 0,
        background: 'var(--bg-deep)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Logo mark */}
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="10" stroke="var(--acid-green)" strokeWidth="1" opacity="0.4" />
            <circle cx="11" cy="11" r="5" stroke="var(--acid-green)" strokeWidth="1" />
            <circle cx="11" cy="11" r="2" fill="var(--acid-green)" />
            <line x1="1" y1="11" x2="6" y2="11" stroke="var(--acid-green)" strokeWidth="1" opacity="0.6" />
            <line x1="16" y1="11" x2="21" y2="11" stroke="var(--acid-green)" strokeWidth="1" opacity="0.6" />
            <line x1="11" y1="1" x2="11" y2="6" stroke="var(--acid-green)" strokeWidth="1" opacity="0.6" />
            <line x1="11" y1="16" x2="11" y2="21" stroke="var(--acid-green)" strokeWidth="1" opacity="0.6" />
          </svg>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            SELF-HEALING<span style={{ color: 'var(--acid-green)' }}>_RAG</span>
          </span>
        </div>

        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          v1.0 · LangGraph + Groq LLaMA 3.1
        </div>

        <div style={{ marginLeft: 'auto' }}>
          <StatusDot healthy={health !== null} />
        </div>

        {health && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
            {health.chunks_indexed} chunks · {health.documents} docs
          </div>
        )}
      </header>

      {/* Main layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '260px 1fr 320px',
        gap: '12px',
        padding: '12px',
        overflow: 'hidden',
        minHeight: 0,
      }}>

        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: 0 }}>
          {/* Tab bar */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-deep)',
            border: '1px solid var(--border-dim)',
            borderBottom: 'none',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            overflow: 'hidden',
          }}>
            {LEFT_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                style={{
                  flex: 1,
                  padding: '8px',
                  background: leftTab === tab ? 'var(--bg-surface)' : 'transparent',
                  color: leftTab === tab ? 'var(--text-primary)' : 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  borderBottom: leftTab === tab ? '1px solid var(--acid-green)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{
            flex: 1,
            background: 'var(--bg-deep)',
            border: '1px solid var(--border-dim)',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {leftTab === 'DOCUMENTS' && (
                <DocumentUploader documents={documents} onDocumentsChange={loadDocuments} />
              )}
              {leftTab === 'HISTORY' && (
                <QueryHistory history={history} onSelect={handleHistorySelect} activeIndex={activeHistory} />
              )}
            </div>
          </div>
        </div>

        {/* Center: query + main output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          {/* Query input */}
          <div style={{
            background: 'var(--bg-deep)',
            border: '1px solid var(--border-dim)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            flexShrink: 0,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
              QUERY_INPUT
            </div>
            <textarea
              ref={textareaRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              rows={3}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-mid)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                fontSize: '14px',
                padding: '12px',
                resize: 'none',
                lineHeight: 1.6,
                transition: 'border-color 0.2s',
                width: '100%',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,255,136,0.4)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-mid)'}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)' }}>
                ⌘+Enter to run
              </span>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !query.trim()}
                style={{
                  padding: '8px 20px',
                  background: isLoading || !query.trim() ? 'var(--bg-raised)' : 'var(--acid-green)',
                  color: isLoading || !query.trim() ? 'var(--text-dim)' : '#000',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  transition: 'all 0.2s',
                  cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? '◌ RUNNING...' : '▶ RUN PIPELINE'}
              </button>
            </div>
          </div>

          {/* Answer + critic */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0, overflowY: 'auto' }}>
            {/* Answer card */}
            <div style={{
              background: 'var(--bg-deep)',
              border: `1px solid ${displayResult?.critic_passed ? 'rgba(0,255,136,0.2)' : displayResult?.is_fallback ? 'rgba(255,77,109,0.2)' : 'var(--border-dim)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              flexShrink: 0,
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '12px' }}>
                GENERATED_ANSWER
              </div>
              {isLoading ? (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--acid-green)',
                      animation: `pulse-glow 1s ease ${i * 0.2}s infinite`,
                    }} />
                  ))}
                  <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginLeft: '8px', fontFamily: 'var(--font-mono)' }}>
                    Pipeline running...
                  </span>
                </div>
              ) : displayResult ? (
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {displayResult.answer}
                </p>
              ) : (
                <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  // answer will appear here
                </p>
              )}
            </div>

            {/* Critic panel */}
            {displayResult && !isLoading && (
              <CriticPanel
                score={displayResult.critic_score}
                reasoning={displayResult.critic_reasoning}
                passed={displayResult.critic_passed}
                retries={displayResult.retries}
                isFallback={displayResult.is_fallback}
              />
            )}
          </div>
        </div>

        {/* Right panel: tabs for trace/sources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', minHeight: 0 }}>
          <div style={{
            display: 'flex',
            background: 'var(--bg-deep)',
            border: '1px solid var(--border-dim)',
            borderBottom: 'none',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
            overflow: 'hidden',
          }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  background: activeTab === tab ? 'var(--bg-surface)' : 'transparent',
                  color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-dim)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  letterSpacing: '0.08em',
                  borderBottom: activeTab === tab ? '1px solid var(--acid-green)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div style={{
            flex: 1,
            background: 'var(--bg-deep)',
            border: '1px solid var(--border-dim)',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
            overflowY: 'auto',
          }}>
            {activeTab === 'TRACE' && (
              <PipelineTrace
                trace={isLoading ? [] : displayResult?.trace}
                isLoading={isLoading}
              />
            )}
            {activeTab === 'SOURCES' && (
              <SourcesPanel sources={displayResult?.sources} />
            )}
            {activeTab === 'ANSWER' && displayResult && (
              <div style={{ padding: '16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '12px' }}>
                  QUERY
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', padding: '10px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', fontStyle: 'italic' }}>
                  "{displayResult.query}"
                </p>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  METADATA
                </div>
                {[
                  ['Critic score', `${Math.round(displayResult.critic_score * 100)}/100`],
                  ['Verdict', displayResult.critic_passed ? 'PASS' : displayResult.is_fallback ? 'FALLBACK' : 'FAIL'],
                  ['Retries', displayResult.retries],
                  ['Sources', displayResult.sources.length],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-dim)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{k}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
