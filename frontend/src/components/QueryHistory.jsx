import React from 'react'

export default function QueryHistory({ history, onSelect, activeIndex }) {
  if (history.length === 0) {
    return (
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          // no queries yet
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px' }}>
      {[...history].reverse().map((item, ri) => {
        const i = history.length - 1 - ri
        const isActive = i === activeIndex
        const scoreColor = item.critic_passed ? '#00ff88' : item.is_fallback ? '#ff4d6d' : '#f59e0b'

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            style={{
              textAlign: 'left',
              padding: '10px 12px',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              border: `1px solid ${isActive ? 'var(--border-mid)' : 'transparent'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-surface)' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: scoreColor, flexShrink: 0 }} />
              <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {Math.round(item.critic_score * 100)}/100
              </span>
              {item.retries > 0 && (
                <span style={{ fontSize: '9px', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>
                  ↺{item.retries}
                </span>
              )}
            </div>
            <p style={{
              fontSize: '12px',
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
            }}>
              {item.query}
            </p>
          </button>
        )
      })}
    </div>
  )
}
