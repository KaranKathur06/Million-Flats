'use client'

// ━━━ VerixShield v2.1 — Data Reliability Indicator ━━━━━━━━━━━━━━━━━━━━━━
// Shows HIGH / MEDIUM / LOW data confidence with visual cue

import React, { useState } from 'react'

interface DataQualityFactor {
  name: string
  score: number
  weight: number
  weighted: number
  detail: string
}

interface DataQualityResult {
  score: number
  status: 'HIGH' | 'MEDIUM' | 'LOW'
  allowValuation: boolean
  factors: DataQualityFactor[]
  recommendation: string
}

interface Props {
  dataQuality: DataQualityResult
}

const STATUS_CONFIG = {
  HIGH: {
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(16, 185, 129, 0.15)',
    text: '#10b981',
    icon: '✓',
    label: 'High Data Confidence',
    glow: 'rgba(16, 185, 129, 0.15)',
  },
  MEDIUM: {
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.15)',
    text: '#f59e0b',
    icon: '◐',
    label: 'Moderate Data Available',
    glow: 'rgba(245, 158, 11, 0.15)',
  },
  LOW: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.15)',
    text: '#ef4444',
    icon: '!',
    label: 'Limited Data Available',
    glow: 'rgba(239, 68, 68, 0.15)',
  },
}

export function DataReliabilityIndicator({ dataQuality }: Props) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[dataQuality.status]

  return (
    <div
      style={{
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '12px',
        padding: '12px 16px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onClick={() => setExpanded(prev => !prev)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: config.glow,
            color: config.text,
            fontSize: '12px',
            fontWeight: 700,
          }}
        >
          {config.icon}
        </span>
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: config.text,
              display: 'block',
            }}
          >
            {config.label}
          </span>
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.35)',
              marginTop: '2px',
              display: 'block',
            }}
          >
            {dataQuality.recommendation}
          </span>
        </div>
        <span
          style={{
            fontSize: '16px',
            fontWeight: 700,
            color: config.text,
          }}
        >
          {dataQuality.score}
        </span>
      </div>

      {expanded && dataQuality.factors.length > 0 && (
        <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${config.border}` }}>
          {dataQuality.factors.map((factor, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
              }}
            >
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>
                {factor.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '4px',
                    borderRadius: '2px',
                    background: 'rgba(255,255,255,0.06)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${factor.score}%`,
                      height: '100%',
                      borderRadius: '2px',
                      background: config.text,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', width: '22px', textAlign: 'right' }}>
                  {factor.score}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DataReliabilityIndicator
