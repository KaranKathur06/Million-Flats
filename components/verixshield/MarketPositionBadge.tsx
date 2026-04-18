'use client'

// ━━━ VerixShield v2.1 — Market Position Badge ━━━━━━━━━━━━━━━━━━━━━━━━━━
// Visual percentile bar showing "Priced higher than X% of similar listings"

import React from 'react'

interface RelativePositionResult {
  percentile: number
  badge: string
  narrative: string
  comparisonBase: number
}

interface Props {
  position: RelativePositionResult
}

const BADGE_COLORS: Record<string, { from: string; to: string; text: string }> = {
  'Undervalued Opportunity': { from: 'rgba(16,185,129,0.15)', to: 'rgba(20,184,166,0.15)', text: '#10b981' },
  'Below Average Price': { from: 'rgba(59,130,246,0.15)', to: 'rgba(6,182,212,0.15)', text: '#3b82f6' },
  'Market Average': { from: 'rgba(100,116,139,0.15)', to: 'rgba(107,114,128,0.15)', text: '#94a3b8' },
  'Above Average Price': { from: 'rgba(245,158,11,0.15)', to: 'rgba(249,115,22,0.15)', text: '#f59e0b' },
}

const DEFAULT_COLOR = { from: 'rgba(239,68,68,0.15)', to: 'rgba(244,63,94,0.15)', text: '#ef4444' }

export function MarketPositionBadge({ position }: Props) {
  const color = BADGE_COLORS[position.badge] || DEFAULT_COLOR

  // Gradient stops for the bar
  const barGradient = `linear-gradient(to right, #10b981 0%, #f59e0b 50%, #ef4444 100%)`

  return (
    <div
      style={{
        padding: '16px',
        borderRadius: '14px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      {/* Badge */}
      <div
        style={{
          display: 'inline-flex',
          padding: '5px 12px',
          borderRadius: '20px',
          background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
          fontSize: '11px',
          fontWeight: 600,
          color: color.text,
          letterSpacing: '0.02em',
        }}
      >
        {position.badge}
      </div>

      {/* Narrative */}
      <p
        style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.45)',
          marginTop: '10px',
          lineHeight: 1.5,
        }}
      >
        {position.narrative}
      </p>

      {/* Percentile bar */}
      <div style={{ marginTop: '14px' }}>
        <div
          style={{
            height: '6px',
            borderRadius: '3px',
            background: 'rgba(255,255,255,0.04)',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {/* Gradient track */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: barGradient,
              opacity: 0.25,
              borderRadius: '3px',
            }}
          />
          {/* Position indicator */}
          <div
            style={{
              position: 'absolute',
              left: `${position.percentile}%`,
              top: '-3px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: color.text,
              border: '2px solid rgba(0,0,0,0.5)',
              transform: 'translateX(-50%)',
              boxShadow: `0 0 8px ${color.text}40`,
              transition: 'left 1s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          />
        </div>

        {/* Labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '6px',
          }}
        >
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>Cheapest</span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
            {position.percentile}th percentile
          </span>
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)' }}>Most Expensive</span>
        </div>
      </div>
    </div>
  )
}

export default MarketPositionBadge
