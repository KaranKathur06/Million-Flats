'use client'

import { useCallback, useRef, useState } from 'react'
import type { LegalDocumentIntelligenceReport } from '@/lib/ai-core/types'
import { AIInsightSkeleton, AIErrorState } from '@/components/ai-shared/AISkeletons'

// ─── Risk Badge ───────────────────────────────────────────────────────────────
const RISK_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  CLEAR:        { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✅ Clear' },
  MINOR_ISSUES: { bg: 'bg-blue-100',    text: 'text-blue-700',    label: '🔵 Minor Issues' },
  CAUTION:      { bg: 'bg-amber-100',   text: 'text-amber-700',   label: '⚠️ Caution' },
  HIGH_RISK:    { bg: 'bg-red-100',     text: 'text-red-700',     label: '🔴 High Risk' },
  BLOCKED:      { bg: 'bg-gray-900',    text: 'text-white',       label: '🚫 Blocked' },
}

function RiskBadge({ level }: { level: string }) {
  const s = RISK_STYLES[level] ?? RISK_STYLES.CAUTION
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  )
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="font-bold text-gray-900">{Math.round(score)}/100</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div className={`h-2 rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

// ─── Upload Form ──────────────────────────────────────────────────────────────
function UploadForm({ onResult }: { onResult: (r: LegalDocumentIntelligenceReport) => void }) {
  const [entityId, setEntityId] = useState('')
  const [entityType, setEntityType] = useState<'MANUAL_PROPERTY' | 'PROJECT'>('MANUAL_PROPERTY')
  const [documentUrl, setDocumentUrl] = useState('')
  const [documentType, setDocumentType] = useState('TITLE_DEED')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!entityId || !documentUrl) return
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai/legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId, entityType, documentUrl, documentType }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      onResult(json.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
      <h2 className="text-base font-bold text-gray-900">Analyze a Document</h2>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Property / Project ID</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. cm123abc..."
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Entity Type</label>
          <select
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value as any)}
          >
            <option value="MANUAL_PROPERTY">Manual Property</option>
            <option value="PROJECT">Project</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Document Type</label>
          <select
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            {['TITLE_DEED', 'RERA_CERTIFICATE', 'NOC', 'OQOOD_CONTRACT', 'SALE_DEED', 'ENCUMBRANCE_CERTIFICATE', 'TAX_RECEIPT'].map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Document URL</label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
            value={documentUrl}
            onChange={(e) => setDocumentUrl(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit}
        disabled={loading || !entityId || !documentUrl}
        className="px-5 py-2.5 rounded-xl bg-[#0a1628] text-white text-sm font-bold hover:bg-[#1a2d4a] disabled:opacity-40 transition-colors"
      >
        {loading ? 'Analyzing...' : 'Run AITitle™ Analysis'}
      </button>
    </div>
  )
}

// ─── Result Panel ─────────────────────────────────────────────────────────────
function ResultPanel({ report }: { report: LegalDocumentIntelligenceReport }) {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">Legal Risk Classification</p>
            <RiskBadge level={report.riskClassification} />
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Documents Analyzed</p>
            <p className="text-2xl font-black text-gray-900">{report.documentsAnalyzed}</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <ScoreBar score={report.legalHealthScore} label="Legal Health Score" />
          <ScoreBar score={report.documentCompletenessScore} label="Document Completeness" />
        </div>
      </div>

      {/* Red Flags */}
      {report.redFlags.length > 0 && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-600 mb-3">🚩 Red Flags</h3>
          <div className="space-y-3">
            {report.redFlags.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-bold ${
                  f.severity === 'HIGH' ? 'bg-red-200 text-red-800' :
                  f.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{f.severity}</span>
                <div>
                  <p className="text-sm font-bold text-red-800">{f.flag.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-red-600 mt-0.5">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Docs */}
      {report.missingDocuments.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">📋 Missing Documents</h3>
          <div className="flex flex-wrap gap-2">
            {report.missingDocuments.map((d) => (
              <span key={d} className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-xs font-medium">
                {d.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">💡 Recommendations</h3>
          <ul className="space-y-1.5">
            {report.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="text-blue-400 mt-0.5">→</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-gray-400 text-right">
        AITitle™ v{report.modelVersion} · {new Date(report.analyzedAt).toLocaleString()} · {report.processingMs}ms
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AITitle() {
  const [result, setResult] = useState<LegalDocumentIntelligenceReport | null>(null)

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="bg-[#0a1628] text-white py-10 px-4">
        <div className="container mx-auto max-w-[1200px]">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-400">AITitle™</span>
          <h1 className="text-3xl font-bold mt-1">Legal Document Intelligence</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Title deed analysis, RERA compliance checks, NOC verification, and legal risk scoring
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1200px] px-4 py-8 space-y-6">
        <UploadForm onResult={setResult} />
        {result && <ResultPanel report={result} />}
      </div>
    </div>
  )
}
