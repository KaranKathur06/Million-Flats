'use client'

import { useEffect, useState, useRef } from 'react'

/**
 * RealtimeBadge — "X users currently exploring properties"
 *
 * Polls /api/analytics/realtime every 45 seconds.
 * Smooths the displayed number to avoid jarring jumps.
 * Gracefully hides if count is 0 or fetch fails.
 */
export default function RealtimeBadge() {
  const [count, setCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchRealtime = async () => {
      try {
        const res = await fetch('/api/analytics/realtime')
        if (!res.ok) return
        const json = await res.json()
        const n = typeof json.realtimeUsers === 'number' ? json.realtimeUsers : 0
        if (!cancelled && n > 0) {
          // Smooth: don't jump more than ±15% at a time
          setCount((prev) => {
            if (prev === 0) return n
            const diff = n - prev
            const maxStep = Math.max(Math.ceil(prev * 0.15), 3)
            if (Math.abs(diff) <= maxStep) return n
            return prev + (diff > 0 ? maxStep : -maxStep)
          })
          setVisible(true)
        }
      } catch {
        // silently ignore
      }
    }

    void fetchRealtime()
    intervalRef.current = setInterval(fetchRealtime, 45_000) // 45s

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (!visible || count <= 0) return null

  return (
    <div className="inline-flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-400/20 rounded-full px-4 py-1.5 backdrop-blur-sm">
      {/* Pulsing dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
      </span>

      <span className="text-emerald-300/90 text-xs sm:text-sm font-medium tracking-wide">
        <span className="font-bold text-emerald-200 tabular-nums">{count.toLocaleString('en-US')}+</span>
        {' '}users exploring properties
      </span>
    </div>
  )
}
