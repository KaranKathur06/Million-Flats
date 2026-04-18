'use client'

// ━━━ VerixShield v2.1 — Why This Price ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Transparent explanation of how the price was computed

import React from 'react'

interface ExplanationFactor {
  icon: string
  label: string
  value: string
  impact: 'positive' | 'negative' | 'neutral'
}

interface ExplanationResult {
  summary: string
  dataPoints: number
  timeRange: string
  medianPricePerSqft: number
  methodology: string
  keyFactors: ExplanationFactor[]
  disclaimer: string
}

interface NormalizationFactors {
  floor: number
  view: number
  developer: number
  furnishing: number
  buildingQuality: number
  compositeFactor: number
}

interface Props {
  explanation: ExplanationResult
  adjustmentFactors: NormalizationFactors
}

const IMPACT_COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#94a3b8',
}

function FactorChip({
  label,
  value,
  impact,
}: {
  label: string
  value: string
  impact: 'positive' | 'negative' | 'neutral'
}) {
  const color = IMPACT_COLORS[impact]
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '6px',
        background: `${color}10`,
        border: `1px solid ${color}20`,
        fontSize: '10px',
        color,
        fontWeight: 500,
      }}
    >
      {label}: {value}
    </div>
  )
}

export function WhyThisPrice({ explanation, adjustmentFactors }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <h4
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.65)',
          margin: 0,
        }}
      >
        <span>💡</span> Why This Price?
      </h4>

      {/* Summary */}
      <p
        style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.45)',
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        {explanation.summary}
      </p>

      {/* Methodology */}
      <div
        style={{
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)',
          padding: '8px 10px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Method:</strong>{' '}
        {explanation.methodology}
      </div>

      {/* Adjustment Factor Chips */}
      {adjustmentFactors.compositeFactor !== 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {adjustmentFactors.floor !== 1 && (
            <FactorChip
              label="Floor"
              value={`×${adjustmentFactors.floor.toFixed(2)}`}
              impact={adjustmentFactors.floor > 1 ? 'positive' : 'negative'}
            />
          )}
          {adjustmentFactors.view !== 1 && (
            <FactorChip
              label="View"
              value={`×${adjustmentFactors.view.toFixed(2)}`}
              impact={adjustmentFactors.view > 1 ? 'positive' : 'negative'}
            />
          )}
          {adjustmentFactors.developer !== 1 && (
            <FactorChip
              label="Developer"
              value={`×${adjustmentFactors.developer.toFixed(2)}`}
              impact={adjustmentFactors.developer > 1 ? 'positive' : 'negative'}
            />
          )}
          {adjustmentFactors.furnishing !== 1 && (
            <FactorChip
              label="Furnishing"
              value={`×${adjustmentFactors.furnishing.toFixed(2)}`}
              impact={adjustmentFactors.furnishing > 1 ? 'positive' : 'negative'}
            />
          )}
        </div>
      )}

      {/* Key Factors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {explanation.keyFactors.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
            }}
          >
            <span style={{ fontSize: '13px' }}>{f.icon}</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', minWidth: '120px' }}>
              {f.label}:
            </span>
            <span
              style={{
                color: IMPACT_COLORS[f.impact],
                fontWeight: 500,
              }}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p
        style={{
          fontSize: '9px',
          color: 'rgba(255,255,255,0.2)',
          lineHeight: 1.5,
          margin: 0,
          fontStyle: 'italic',
        }}
      >
        {explanation.disclaimer}
      </p>
    </div>
  )
}

export default WhyThisPrice
