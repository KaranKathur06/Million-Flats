'use client'

import { useMemo, useState } from 'react'

function formatINR(n: number) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function ManagementYieldToolClient() {
  const [propertyValue, setPropertyValue] = useState(20000000)
  const [monthlyRent, setMonthlyRent] = useState(80000)
  const [mgmtFeePct, setMgmtFeePct] = useState(8)

  const yearlyRent = useMemo(() => monthlyRent * 12, [monthlyRent])
  const mgmtFee = useMemo(() => (yearlyRent * mgmtFeePct) / 100, [yearlyRent, mgmtFeePct])
  const netRent = useMemo(() => yearlyRent - mgmtFee, [yearlyRent, mgmtFee])
  const grossYieldPct = useMemo(() => (yearlyRent / propertyValue) * 100, [yearlyRent, propertyValue])
  const netYieldPct = useMemo(() => (netRent / propertyValue) * 100, [netRent, propertyValue])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">Management Fee &amp; Yield Calculator</h3>
        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Property Value</span>
              <span className="text-gray-600">₹ {formatINR(propertyValue)}</span>
            </div>
            <input
              type="range"
              min={2000000}
              max={200000000}
              step={200000}
              value={propertyValue}
              onChange={(e) => setPropertyValue(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Monthly Rent</span>
              <span className="text-gray-600">₹ {formatINR(monthlyRent)}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={500000}
              step={1000}
              value={monthlyRent}
              onChange={(e) => setMonthlyRent(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Management Fee</span>
              <span className="text-gray-600">{mgmtFeePct}%</span>
            </div>
            <input
              type="range"
              min={3}
              max={15}
              step={0.5}
              value={mgmtFeePct}
              onChange={(e) => setMgmtFeePct(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-bold text-gray-500">Gross Yield</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{grossYieldPct.toFixed(2)}%</div>
              <div className="mt-1 text-xs text-gray-600">₹ {formatINR(yearlyRent)} / year</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-bold text-gray-500">Net Yield (after fee)</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">{netYieldPct.toFixed(2)}%</div>
              <div className="mt-1 text-xs text-gray-600">₹ {formatINR(netRent)} / year</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">Directory + Filters</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {['Residential', 'Commercial', 'NRI', 'Rent Collection', 'Maintenance', 'Reporting'].map((t) => (
            <span key={t} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-200 p-4">
              <div className="h-10 w-28 rounded bg-gray-100" />
              <div className="mt-2 text-sm font-semibold text-gray-900">Manager {i}</div>
              <div className="mt-1 text-sm text-gray-600">98% Occupancy Rate</div>
              <div className="mt-4 h-10 w-full rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
