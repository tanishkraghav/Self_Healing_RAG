import React from 'react'

function ScoreArc({ score }) {
  const r = 36
  const circumference = 2 * Math.PI * r
  const dash = circumference * score
  const gap = circumference - dash

  const color = score >= 0.8
    ? '#00ff88'
    : score >= 0.6
    ? '#f59e0b'
    : '#ff4d6d'

  return (
    <div style={{ position: 'relative', width: '96px', height: '96px', flexShrink: 0 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 1s ease', filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color, fontFamily: 'var(--font-mono)' }}>
          {Math.round(score * 100)}
        </span>
        <span style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
          /100
        </span>
      </div>
    </div>
  )
}

export default function CriticPanel({ score, reasoning, passed, retries, isFallback }) {
  const label = isFallback ? 'FALLBACK' : passed ? 'VERIFIED' : 'REJECTED'
  const labelColor = isFallback ? '#ff4d6d' : passed ? '#00ff88' : '#ff4d6d'
  const labelBg = isFallback ? 'rgba(255,77,109,0.1)' : passed ? 'rgba(0,255,136,0.1)' : 'rgba(255,77,109,0.1)'

  return (
    <div style={{
      background: 'var(--bg-raised)',
      border: '1px solid var(--border-dim)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--text-dim)',
        letterSpacing: '0.1em',
      }}>
        CRITIC_EVALUATION
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
        <ScoreArc score={score} />
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: labelBg,
            border: `1px solid ${labelColor}40`,
            borderRadius: 'var(--radius-sm)',
            padding: '3px 10px',
            marginBottom: '8px',
          }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: labelColor }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, color: labelColor, letterSpacing: '0.08em' }}>
              {label}
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {reasoning || 'No evaluation available.'}
          </p>
          {retries > 0 && (
            <div style={{
              marginTop: '8px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: 'var(--amber)',
            }}>
              ↺ {retries} retry{retries > 1 ? 's' : ''} performed
            </div>
          )}
        </div>
      </div>

      {/* Score bar breakdown */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const threshold = (i + 1) / 10
          const filled = score >= threshold
          const partial = score > i / 10 && !filled
          const color = score >= 0.8 ? '#00ff88' : score >= 0.6 ? '#f59e0b' : '#ff4d6d'
          return (
            <div key={i} style={{
              flex: 1, height: '4px',
              borderRadius: '2px',
              background: filled || partial ? color : 'var(--border-dim)',
              opacity: filled ? 1 : partial ? 0.5 : 0.3,
              transition: `background 0.5s ease ${i * 0.05}s`,
            }} />
          )
        })}
      </div>
    </div>
  )
}
