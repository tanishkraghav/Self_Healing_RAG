import React, { useState } from 'react'

function SourceCard({ source, index }) {
  const [expanded, setExpanded] = useState(false)
  const filename = source.metadata?.filename || 'Unknown'
  const page = source.metadata?.page
  const ext = filename.split('.').pop().toUpperCase()
  const extColors = { PDF: '#ff4d6d', TXT: '#38bdf8', MD: '#a78bfa' }
  const color = extColors[ext] || '#8892a4'

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-md)',
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(x => !x)}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textAlign: 'left',
          color: 'var(--text-primary)',
        }}
      >
        <span style={{
          width: '20px', height: '20px',
          background: `${color}15`,
          border: `1px solid ${color}30`,
          borderRadius: 'var(--radius-sm)',
          fontSize: '7px', fontWeight: 700,
          color, fontFamily: 'var(--font-mono)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {ext}
        </span>
        <span style={{ flex: 1, fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {filename}{page !== undefined ? ` · p.${page + 1}` : ''}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-dim)',
          background: 'var(--bg-raised)',
          padding: '2px 6px',
          borderRadius: 'var(--radius-sm)',
        }}>
          #{index + 1}
        </span>
        <span style={{ color: 'var(--text-dim)', fontSize: '12px', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'none' }}>
          ▶
        </span>
      </button>
      {expanded && (
        <div style={{
          padding: '0 14px 14px',
          borderTop: '1px solid var(--border-dim)',
          paddingTop: '12px',
        }}>
          <p style={{
            fontSize: '11px',
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {source.content}
            {source.content.length >= 300 ? '…' : ''}
          </p>
        </div>
      )}
    </div>
  )
}

export default function SourcesPanel({ sources }) {
  if (!sources || sources.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          // retrieved chunks appear here
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: '6px' }}>
        CONTEXT_CHUNKS · {sources.length} retrieved
      </div>
      {sources.map((s, i) => <SourceCard key={i} source={s} index={i} />)}
    </div>
  )
}
