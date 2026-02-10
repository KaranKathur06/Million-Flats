'use client'

import { useMemo, useState } from 'react'
import { trackEvent } from '@/lib/analytics'

function formatINR(n: number) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function InsuranceToolsClient() {
  const [propertyValue, setPropertyValue] = useState(10000000)
  const [coveragePct, setCoveragePct] = useState(80)
  const [cityRisk, setCityRisk] = useState(1.0)

  const sumInsured = useMemo(() => (propertyValue * coveragePct) / 100, [propertyValue, coveragePct])

  const estimatedPremium = useMemo(() => {
    const baseRate = 0.0022
    const premium = sumInsured * baseRate * cityRisk
    return Math.max(2500, premium)
  }, [sumInsured, cityRisk])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">Insurance Premium Calculator</h3>
        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Property Value</span>
              <span className="text-gray-600">₹ {formatINR(propertyValue)}</span>
            </div>
            <input
              type="range"
              min={1000000}
              max={100000000}
              step={100000}
              value={propertyValue}
              onChange={(e) => {
                const v = Number(e.target.value)
                setPropertyValue(v)
                trackEvent('ecosystem_tool_use', { tool: 'insurance_premium_calculator', field: 'property_value', value: v })
              }}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Desired Coverage</span>
              <span className="text-gray-600">{coveragePct}%</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={1}
              value={coveragePct}
              onChange={(e) => {
                const v = Number(e.target.value)
                setCoveragePct(v)
                trackEvent('ecosystem_tool_use', { tool: 'insurance_premium_calculator', field: 'coverage_pct', value: v })
              }}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Location Risk</span>
              <span className="text-gray-600">{cityRisk.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={0.8}
              max={1.6}
              step={0.05}
              value={cityRisk}
              onChange={(e) => {
                const v = Number(e.target.value)
                setCityRisk(v)
                trackEvent('ecosystem_tool_use', { tool: 'insurance_premium_calculator', field: 'location_risk', value: v })
              }}
              className="mt-2 w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-bold text-gray-500">Sum Insured</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">₹ {formatINR(sumInsured)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4 md:col-span-2">
              <div className="text-xs font-bold text-gray-500">Estimated Annual Premium</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">₹ {formatINR(estimatedPremium)}</div>
              <div className="mt-1 text-xs text-gray-600">This is an estimate for engagement only.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">Directory + Filters</h3>
        <p className="mt-2 text-sm text-gray-600">
          Next: searchable directory of verified insurance partners (insurer vs broker, products, claim ratios, and more).
        </p>
        <div className="mt-5 grid grid-cols-1 gap-3">
          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900">Suggested Filters</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Insurer', 'Broker', 'Home', 'Fire', 'Burglary', 'High Claim Ratio (>95%)'].map((t) => (
                <span key={t} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900">Partner Listing Preview</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-gray-200 p-4">
                  <div className="h-10 w-28 rounded bg-gray-100" />
                  <div className="mt-2 text-sm font-semibold text-gray-900">Partner {i}</div>
                  <div className="mt-1 text-sm text-gray-600">Instant Policy Issuance</div>
                  <div className="mt-3 h-10 w-full rounded-xl bg-gray-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
