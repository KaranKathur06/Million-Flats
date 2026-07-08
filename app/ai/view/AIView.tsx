'use client'

import { useCallback, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { MediaIntelligenceReport, MediaItemAnalysis } from '@/lib/ai-core/types'
import { MediaGridSkeleton, AIErrorState } from '@/components/ai-shared/AISkeletons'

// ─── Trust Badge ──────────────────────────────────────────────────────────────
function TrustBadge({ score }: { score: number }) {
  const { color, label, bg } =
    score >= 80 ? { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Highly Authentic' } :
    score >= 60 ? { color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       label: 'Mostly Authentic' } :
    score >= 40 ? { color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     label: 'Review Needed' } :
                  { color: 'text-red-700',      bg: 'bg-red-50 border-red-200',         label: 'High Risk' }
  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${bg}`}>
      <span className={`text-2xl font-black ${color}`}>{Math.round(score)}</span>
      <div>
        <p className={`text-xs font-bold ${color}`}>{label}</p>
        <p className="text-xs text-gray-400">Trust Score / 100</p>
      </div>
    </div>
  )
}

// ─── Image Analysis Card ──────────────────────────────────────────────────────
function ImageCard({ img }: { img: any }) {
  const flags = [
    img.isAiGenerated && { label: '🤖 AI Generated', cls: 'bg-red-100 text-red-700' },
    img.isManipulated && { label: '✂️ Manipulated', cls: 'bg-orange-100 text-orange-700' },
    img.isVirtualStaged && { label: '🛋️ Virtual Staged', cls: 'bg-blue-100 text-blue-700' },
    img.isBlurry && { label: '🔲 Blurry', cls: 'bg-gray-100 text-gray-600' },
    img.hasDefects && { label: '⚠️ Defects', cls: 'bg-amber-100 text-amber-700' },
  ].filter(Boolean) as { label: string; cls: string }[]

  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <div className="relative aspect-video bg-gray-100">
        <img
          src={img.url}
          alt="Property media"
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder-property.jpg' }}
        />
        {/* Trust score overlay */}
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          Trust: {Math.round(img.trustScore ?? 0)}
        </div>
      </div>
      <div className="p-3 space-y-2">
        {img.roomType && (
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{img.roomType?.replace(/_/g, ' ')}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {flags.map(f => (
            <span key={f.label} className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.cls}`}>{f.label}</span>
          ))}
          {flags.length === 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">✅ Clean</span>
          )}
        </div>
        {img.qualityScore != null && (
          <div className="h-1 rounded-full bg-gray-100">
            <div
              className={`h-1 rounded-full ${img.qualityScore >= 70 ? 'bg-emerald-500' : img.qualityScore >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
              style={{ width: `${img.qualityScore}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AIView() {
  const searchParams = useSearchParams()
  const entityId = searchParams?.get('entityId') ?? ''
  const entityType = (searchParams?.get('entityType') ?? 'MANUAL_PROPERTY') as 'MANUAL_PROPERTY' | 'PROJECT'

  const [imageUrls, setImageUrls] = useState('')
  const [report, setReport] = useState<MediaIntelligenceReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [idInput, setIdInput] = useState(entityId)
  const [typeInput, setTypeInput] = useState(entityType)

  const analyze = useCallback(async () => {
    const urls = imageUrls.split('\n').map(u => u.trim()).filter(Boolean)
    if (!idInput || urls.length === 0) return

    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/ai/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityId: idInput, entityType: typeInput, imageUrls: urls }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setReport(json.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [idInput, typeInput, imageUrls])

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <div className="bg-[#0a1628] text-white py-10 px-4">
        <div className="container mx-auto max-w-[1400px]">
          <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">AIView™</span>
          <h1 className="text-3xl font-bold mt-1">Property Media Intelligence</h1>
          <p className="text-gray-400 mt-1 text-sm">
            AI image authenticity, virtual staging detection, defect analysis, and quality scoring
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-[1400px] px-4 py-8 space-y-6">

        {/* Input Form */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">Analyze Property Images</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Property / Project ID</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="Property or Project ID..."
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Entity Type</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={typeInput}
                onChange={(e) => setTypeInput(e.target.value as any)}
              >
                <option value="MANUAL_PROPERTY">Manual Property</option>
                <option value="PROJECT">Project</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Image URLs (one per line, max 20)
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
              rows={5}
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
              value={imageUrls}
              onChange={(e) => setImageUrls(e.target.value)}
            />
          </div>
          {error && <AIErrorState message={error} onRetry={analyze} />}
          <button
            onClick={analyze}
            disabled={loading || !idInput || !imageUrls.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#0a1628] text-white text-sm font-bold hover:bg-[#1a2d4a] disabled:opacity-40 transition-colors"
          >
            {loading ? 'Analyzing images...' : 'Run AIView™ Analysis'}
          </button>
        </div>

        {/* Results */}
        {loading && <MediaGridSkeleton />}

        {report && !loading && (
          <div className="space-y-5">
            {/* Overview */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap gap-6 items-center justify-between">
                <TrustBadge score={report.mediaTrustScore} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                  {[
                    { label: 'Images Analyzed', value: String(report.totalImages) },
                    { label: 'Avg Quality', value: `${Math.round(report.overallQualityScore)}/100` },
                    { label: 'AI Generated', value: String(report.aiGeneratedImages) },
                    { label: 'Defects Found', value: String(report.defectImages) },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-2xl font-black text-gray-900">{value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {report.recommendations.length > 0 && (
                <div className="mt-5 border-t border-gray-50 pt-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Recommendations</p>
                  <ul className="space-y-1">
                    {report.recommendations.map((r, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-gray-400 mt-0.5">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Image Grid */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">Image Analysis Results</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {report.items.map((img: MediaItemAnalysis, i: number) => (
                  <ImageCard key={i} img={img} />
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-400 text-right">
              AIView™ v{report.modelVersion} · {new Date(report.analyzedAt).toLocaleString()} · {report.processingMs}ms
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
