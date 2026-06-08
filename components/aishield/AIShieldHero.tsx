'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatAEDCompact } from '@/lib/pricing'

interface PlatformStats {
  projectsAnalyzed: number
  assetsCoveredAed: number
  predictionAccuracy: number
  aiEngines: number
}

export function AIShieldHero({ onExplore }: { onExplore?: () => void }) {
  const [stats, setStats] = useState<PlatformStats | null>(null)

  useEffect(() => {
    fetch('/api/ai-shield/stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setStats(json.stats)
      })
      .catch(() => {})
  }, [])

  const statItems = [
    {
      value: stats ? `${stats.projectsAnalyzed}+` : '—',
      label: 'Projects Analyzed',
    },
    {
      value: stats?.assetsCoveredAed ? formatAEDCompact(stats.assetsCoveredAed) : '—',
      label: 'Assets Covered',
    },
    {
      value: stats ? `${stats.predictionAccuracy}%` : '—',
      label: 'Avg Confidence',
    },
    {
      value: stats ? String(stats.aiEngines) : '5',
      label: 'AI Engines',
    },
  ]

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#060f1c] via-[#0a1628] to-[#0f2847] text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/[0.07] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/[0.05] rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Market Intelligence
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.08]">
            AIShield<sup className="text-lg text-blue-400/70 align-super">™</sup>
          </h1>
          <p className="mt-3 text-lg sm:text-xl text-white/70 font-medium">
            Dubai&apos;s AI-Powered Property Intelligence Platform
          </p>
          <p className="mt-4 text-base text-white/45 leading-relaxed max-w-2xl">
            Analyze fair value, compare projects, discover market opportunities, and avoid overpriced
            investments — powered by five parallel intelligence engines.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onExplore}
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-white text-[#0a1628] text-sm font-bold rounded-xl hover:bg-white/95 shadow-lg shadow-black/20 transition-colors"
            >
              Explore Projects
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <Link
              href="/ai/shield/about"
              className="inline-flex items-center px-6 py-3.5 text-sm font-semibold text-white/70 border border-white/15 rounded-xl hover:bg-white/[0.06] transition-colors"
            >
              How it works
            </Link>
          </div>
        </div>

        <div className="mt-12 lg:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statItems.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/[0.04] border border-white/[0.08] px-4 sm:px-5 py-4 sm:py-5 backdrop-blur-sm"
            >
              <div className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">{s.value}</div>
              <div className="text-[11px] sm:text-xs text-white/40 uppercase tracking-wider mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
