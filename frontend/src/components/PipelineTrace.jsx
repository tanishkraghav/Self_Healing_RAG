import React, { useEffect, useState } from 'react'

const NODE_CONFIG = {
  start:      { label: 'START',      color: '#8892a4', bg: 'rgba(136,146,164,0.1)',  icon: '◉' },
  retrieve:   { label: 'RETRIEVE',   color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',   icon: '⟳' },
  generate:   { label: 'GENERATE',   color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  icon: '◈' },
  critique:   { label: 'CRITIQUE',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: '⊛' },
  reformulate:{ label: 'REFORMULATE',color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   icon: '↺' },
  fallback:   { label: 'FALLBACK',   color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)',   icon: '⚠' },
  end:        { label: 'END',        color: '#00ff88', bg: 'rgba(0,255,136,0.1)',    icon: '✓' },
}

function TraceStep({ step, index, isActive, isComplete }) {
  const [visible, setVisible] = useState(false)
  const cfg = NODE_CONFIG[step.node] || NODE_CONFIG.start

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), index * 120)
    return () => clearTimeout(t)
  }, [index])

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-12px)',
      transition: 'all 0.35s ease',
      marginBottom: '8px',
    }}>
      {/* Connector line + dot */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, flexShrink: 0 }}>
        <div style={{
          width: '32px', height: '32px',
          borderRadius: '8px',
          background: cfg.bg,
          border: `1px solid ${cfg.color}40`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '14px',
          color: cfg.color,
          position: 'relative',
          flexShrink: 0,
        }}>
          {cfg.icon}
          {isActive && (
            <div style={{
              position: 'absolute', inset: '-3px',
              borderRadius: '10px',
              border: `1px solid ${cfg.color}`,
              animation: 'pulse-glow 1.2s ease infinite',
            }} />
          )}
        </div>
        <div style={{ width: '1px', flexGrow: 1, minHeight: '8px', background: `${cfg.color}20`, marginTop: '2px' }} />
      </div>

      {/* Content */}
      <div style={{ paddingTop: '6px', flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            color: cfg.color,
            letterSpacing: '0.08em',
          }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
            #{String(index).padStart(2, '0')}
          </span>
        </div>
        <p style={{
          fontSize: '12px',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {step.detail}
        </p>
      </div>
    </div>
  )
}

export default function PipelineTrace({ trace, isLoading }) {
  const steps = trace || []

  if (isLoading && steps.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <div style={{
          width: '24px', height: '24px',
          border: '2px solid var(--border-mid)',
          borderTopColor: 'var(--acid-green)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 12px',
        }} />
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          Initializing pipeline...
        </p>
      </div>
    )
  }

  if (steps.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
          // Pipeline trace will appear here
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '10px',
        color: 'var(--text-dim)',
        letterSpacing: '0.1em',
        marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ color: 'var(--acid-green)' }}>▶</span>
        EXECUTION_TRACE · {steps.length} events
      </div>

      {steps.map((step, i) => (
        <TraceStep
          key={i}
          step={step}
          index={i}
          isActive={isLoading && i === steps.length - 1}
          isComplete={!isLoading}
        />
      ))}

      {!isLoading && steps.length > 0 && (
        <div style={{
          marginTop: '8px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-dim)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--acid-green)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--acid-green)' }}>
            PIPELINE COMPLETE
          </span>
        </div>
      )}
    </div>
  )
}
