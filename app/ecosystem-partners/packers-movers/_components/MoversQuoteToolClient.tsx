'use client'

import { useMemo, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

function formatINR(n: number) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const VOLUME_MULTIPLIER: Record<string, number> = {
  '1BHK': 1,
  '2BHK': 1.35,
  '3BHK': 1.7,
  '4BHK+': 2.1,
  Office: 2.4,
}

export default function MoversQuoteToolClient() {
  const [moveType, setMoveType] = useState<'Local' | 'Domestic'>('Local')
  const [volume, setVolume] = useState<'1BHK' | '2BHK' | '3BHK' | '4BHK+' | 'Office'>('2BHK')
  const [fromPin, setFromPin] = useState('')
  const [toPin, setToPin] = useState('')

  const estimate = useMemo(() => {
    const base = moveType === 'Local' ? 9000 : 24000
    const v = VOLUME_MULTIPLIER[volume]
    const hasPins = String(fromPin).trim().length >= 4 && String(toPin).trim().length >= 4
    const pinFactor = hasPins ? 1.05 : 1
    return base * v * pinFactor
  }, [moveType, volume, fromPin, toPin])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">Instant Quote Calculator</h3>
        <p className="mt-2 text-sm text-gray-600">
          Estimate your moving cost quickly (engagement tool). Final quotes depend on survey, distance, and services.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <label className="text-sm">
            <div className="font-semibold text-gray-900">Move Type</div>
            <select
              value={moveType}
              onChange={(e) => {
                const v = e.target.value as any
                setMoveType(v)
                trackEvent('ecosystem_tool_use', { tool: 'movers_quote_calculator', field: 'move_type', value: v })
              }}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
            >
              <option value="Local">Local (Same City)</option>
              <option value="Domestic">Domestic (City-to-City)</option>
            </select>
          </label>

          <label className="text-sm">
            <div className="font-semibold text-gray-900">Volume</div>
            <select
              value={volume}
              onChange={(e) => {
                const v = e.target.value as any
                setVolume(v)
                trackEvent('ecosystem_tool_use', { tool: 'movers_quote_calculator', field: 'volume', value: v })
              }}
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
            >
              <option value="1BHK">1BHK</option>
              <option value="2BHK">2BHK</option>
              <option value="3BHK">3BHK</option>
              <option value="4BHK+">4BHK+</option>
              <option value="Office">Office</option>
            </select>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="text-sm">
              <div className="font-semibold text-gray-900">From PIN</div>
              <input
                value={fromPin}
                onChange={(e) => {
                  const v = e.target.value
                  setFromPin(v)
                  trackEvent('ecosystem_tool_use', { tool: 'movers_quote_calculator', field: 'from_pin' })
                }}
                placeholder="e.g., 400001"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
              />
            </label>
            <label className="text-sm">
              <div className="font-semibold text-gray-900">To PIN</div>
              <input
                value={toPin}
                onChange={(e) => {
                  const v = e.target.value
                  setToPin(v)
                  trackEvent('ecosystem_tool_use', { tool: 'movers_quote_calculator', field: 'to_pin' })
                }}
                placeholder="e.g., 560001"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Estimated Quote</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">₹ {formatINR(estimate)}</div>
            <div className="mt-1 text-xs text-gray-600">Estimate only. Add-ons like packing, storage, or vehicle transport change pricing.</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">Directory + Filters</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Local', 'Domestic', 'Packing', 'Car Transport', 'Storage', 'Insured'].map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 p-4">
              <div className="h-10 w-28 rounded bg-gray-100" />
              <div className="mt-2 text-sm font-semibold text-gray-900">Mover {i}</div>
              <div className="mt-1 text-sm text-gray-600">Verified &amp; Insured</div>
              <div className="mt-4 h-10 w-full rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
