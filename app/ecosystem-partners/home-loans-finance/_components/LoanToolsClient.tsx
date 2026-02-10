'use client'

import { useMemo, useState } from 'react'

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function formatINR(n: number) {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

function calcEmi(principal: number, annualRatePct: number, months: number) {
  const r = annualRatePct / 12 / 100
  if (r === 0) return principal / months
  const pow = Math.pow(1 + r, months)
  return (principal * r * pow) / (pow - 1)
}

export default function LoanToolsClient() {
  const [amount, setAmount] = useState(5000000)
  const [rate, setRate] = useState(9)
  const [tenureYears, setTenureYears] = useState(20)

  const months = useMemo(() => clamp(Math.round(tenureYears * 12), 12, 360), [tenureYears])

  const emi = useMemo(() => calcEmi(amount, rate, months), [amount, rate, months])
  const totalPayment = useMemo(() => emi * months, [emi, months])
  const totalInterest = useMemo(() => totalPayment - amount, [totalPayment, amount])

  const [income, setIncome] = useState('')
  const [obligations, setObligations] = useState('')
  const [desiredLoan, setDesiredLoan] = useState('')

  const eligibility = useMemo(() => {
    const inc = Number(income)
    const obl = Number(obligations)
    if (!Number.isFinite(inc) || inc <= 0) return null
    const net = Math.max(0, inc - (Number.isFinite(obl) ? Math.max(0, obl) : 0))

    const assumedDti = 0.45
    const eligibleEmi = net * assumedDti

    const assumedAnnualRate = 9
    const assumedMonths = 240
    const r = assumedAnnualRate / 12 / 100
    const pow = Math.pow(1 + r, assumedMonths)
    const principal = (eligibleEmi * (pow - 1)) / (r * pow)

    const desired = Number(desiredLoan)
    return {
      eligibleEmi,
      eligibleLoan: principal,
      desiredLoan: Number.isFinite(desired) && desired > 0 ? desired : null,
    }
  }, [income, obligations, desiredLoan])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">EMI Calculator</h3>
        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Loan Amount</span>
              <span className="text-gray-600">₹ {formatINR(amount)}</span>
            </div>
            <input
              type="range"
              min={500000}
              max={50000000}
              step={50000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Interest Rate</span>
              <span className="text-gray-600">{rate.toFixed(2)}%</span>
            </div>
            <input
              type="range"
              min={6}
              max={16}
              step={0.05}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-gray-900">Tenure</span>
              <span className="text-gray-600">{tenureYears} years</span>
            </div>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              className="mt-2 w-full"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-bold text-gray-500">Monthly EMI</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">₹ {formatINR(emi)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-bold text-gray-500">Total Interest</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">₹ {formatINR(totalInterest)}</div>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-xs font-bold text-gray-500">Total Payment</div>
              <div className="mt-1 text-lg font-semibold text-gray-900">₹ {formatINR(totalPayment)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-gray-900">Quick Eligibility Checker</h3>
        <p className="mt-2 text-sm text-gray-600">
          Enter 3 details to see an instant preliminary eligibility estimate.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <label className="text-sm">
            <div className="font-semibold text-gray-900">Net Monthly Income</div>
            <input
              inputMode="numeric"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="e.g., 150000"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </label>

          <label className="text-sm">
            <div className="font-semibold text-gray-900">Existing Obligations</div>
            <input
              inputMode="numeric"
              value={obligations}
              onChange={(e) => setObligations(e.target.value)}
              placeholder="e.g., 20000"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </label>

          <label className="text-sm">
            <div className="font-semibold text-gray-900">Desired Loan Amount</div>
            <input
              inputMode="numeric"
              value={desiredLoan}
              onChange={(e) => setDesiredLoan(e.target.value)}
              placeholder="e.g., 6000000"
              className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3"
            />
          </label>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900">Estimated Eligibility</div>
            {eligibility ? (
              <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border border-gray-200 p-4">
                  <div className="text-xs font-bold text-gray-500">Eligible Monthly EMI</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">₹ {formatINR(eligibility.eligibleEmi)}</div>
                </div>
                <div className="rounded-xl bg-white border border-gray-200 p-4">
                  <div className="text-xs font-bold text-gray-500">Eligible Loan Amount</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">₹ {formatINR(eligibility.eligibleLoan)}</div>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-gray-600">Enter your income to see eligibility.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
