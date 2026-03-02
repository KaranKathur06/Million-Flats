'use client'

import { useMemo, useState } from 'react'

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

type FaqItem = { q: string; a: string }

const FAQS: FaqItem[] = [
  {
    q: 'Is there a free trial?',
    a: 'Yes. You can start a 14-day trial. No credit card required during early access.',
  },
  {
    q: 'Can I upgrade later?',
    a: 'Yes. Upgrades are pro-rated and your plan benefits update immediately after activation.',
  },
  {
    q: 'Does this affect my agent verification?',
    a: 'Verification and compliance remain enforced. Plans unlock tools, not policy bypasses.',
  },
  {
    q: 'What happens if I cancel?',
    a: 'You keep access until the end of your billing period. After that, plan features are disabled.',
  },
]

function money(n: number) {
  return `₹${Math.round(n).toLocaleString()}`
}

export default function PricingClient() {
  const [dealValue, setDealValue] = useState<string>('10000000')
  const [commissionPct, setCommissionPct] = useState<string>('2.5')
  const [roiPlan, setRoiPlan] = useState<'BASIC' | 'PROFESSIONAL' | 'PREMIUM'>('PROFESSIONAL')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const deal = safeNumber(dealValue)
  const pct = safeNumber(commissionPct)

  const commission = useMemo(() => {
    const v = deal * (pct / 100)
    return Number.isFinite(v) ? v : 0
  }, [deal, pct])

  const planCost = useMemo(() => {
    if (roiPlan === 'BASIC') return 7999
    if (roiPlan === 'PREMIUM') return 39999
    return 19999
  }, [roiPlan])

  const roiMultiple = useMemo(() => {
    if (!commission) return 0
    return commission / planCost
  }, [commission, planCost])

  return (
    <>
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="text-center">
            <p className="text-dark-blue font-semibold tracking-wide">MillionFlats</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-serif font-bold text-dark-blue">MillionFlats Agent Subscription Plans</h1>
            <p className="mt-4 text-gray-600 max-w-[780px] mx-auto">AI-Powered Real Estate Tools for Smarter Selling</p>

            <div className="mt-6 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm text-dark-blue">
                <span className="font-semibold">Save 20%</span>
                <span className="text-gray-600">with Launch Offer (Limited Time)</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="/agent/register"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Start 14-Day Free Trial
              </a>
              <a
                href="#compare"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                Compare Plans
              </a>
            </div>

            <p className="mt-4 text-sm text-gray-500">No credit card required • Cancel anytime • Pro-rated upgrades</p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-dark-blue">India Pricing (₹)</h2>
              <p className="mt-2 text-gray-600 text-sm">Annual billing. Monthly equivalent shown for clarity.</p>
            </div>
            <a href="#how" className="text-sm font-semibold text-dark-blue hover:underline">
              How to subscribe
            </a>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-7">
              <p className="text-dark-blue font-semibold">Basic</p>
              <p className="mt-2 text-sm text-gray-500">Normally {money(9999)}</p>
              <p className="mt-3 text-4xl font-bold text-gray-900">
                {money(7999)}
                <span className="text-base font-semibold text-gray-500">/year</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">{money(667)}/month</p>
              <p className="mt-4 text-sm text-gray-600">Best for individual agents, starters</p>

              <a
                href="/agent/register"
                className="mt-7 inline-flex w-full items-center justify-center h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Choose Plan
              </a>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-white shadow-lg p-7 relative lg:scale-[1.03]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center h-7 px-3 rounded-full bg-dark-blue text-white text-xs font-semibold">Most Popular</span>
              </div>

              <p className="text-dark-blue font-semibold">Professional</p>
              <p className="mt-2 text-sm text-gray-500">Normally {money(24999)}</p>
              <p className="mt-3 text-4xl font-bold text-gray-900">
                {money(19999)}
                <span className="text-base font-semibold text-gray-500">/year</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">{money(1667)}/month</p>
              <p className="mt-4 text-sm text-gray-600">Best for established agents, steady business</p>

              <a
                href="/agent/register"
                className="mt-7 inline-flex w-full items-center justify-center h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Choose Plan
              </a>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-7">
              <p className="text-dark-blue font-semibold">Premium</p>
              <p className="mt-2 text-sm text-gray-500">Normally {money(49999)}</p>
              <p className="mt-3 text-4xl font-bold text-gray-900">
                {money(39999)}
                <span className="text-base font-semibold text-gray-500">/year</span>
              </p>
              <p className="mt-1 text-sm text-gray-500">{money(3333)}/month</p>
              <p className="mt-4 text-sm text-gray-600">Best for top agents, small agencies</p>

              <a
                href="/agent/register"
                className="mt-7 inline-flex w-full items-center justify-center h-11 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Choose Plan
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="compare" className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-14">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">What's Included</h2>
              <p className="mt-2 text-gray-600 text-sm">Feature comparison across plans (India).</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Feature</th>
                    <th className="text-left font-semibold px-6 py-4">Basic</th>
                    <th className="text-left font-semibold px-6 py-4">Professional</th>
                    <th className="text-left font-semibold px-6 py-4">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['VerixView™ (Authenticity)', '✓ Basic', '✓ Full', '✓ Full + Priority'],
                    ['VerixShield™ (Fair Pricing)', '✗', '✓', '✓ + Alerts'],
                    ['VerixIndex™ (Investment Potential)', '✗', '✓ Basic', '✓ Advanced'],
                    ['VerixPro™ Agent Score', '✓ Standard', '✓ Enhanced', '✓ Featured Badge'],
                    ['Agent Profile', 'Standard', 'Featured', 'Premium + Verified'],
                    ['Listings Included', '20 properties', '100 properties', 'Unlimited'],
                    ['Lead Alerts', 'Weekly', 'Daily', 'Real-time'],
                    ['WhatsApp Integration', '✗', '✓ Basic', '✓ + Automation'],
                    ['Ecosystem Partner Access', 'Basic', 'Preferred Rates', 'VIP Access'],
                    ['3D Tour Discount', '10% off', '25% off', '30% off'],
                    ['Support', 'Email', 'Priority Email', 'Dedicated WhatsApp'],
                  ].map((row, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-6 py-4 text-gray-900 font-medium">{row[0] as string}</td>
                      <td className="px-6 py-4 text-gray-700">{row[1] as string}</td>
                      <td className="px-6 py-4 text-gray-700">{row[2] as string}</td>
                      <td className="px-6 py-4 text-gray-700">{row[3] as string}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-14">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-7">
            <h2 className="text-2xl font-serif font-bold text-dark-blue">ROI Calculator</h2>
            <p className="mt-2 text-gray-600 text-sm">Estimate ROI based on your average deal value.</p>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Average deal value</label>
                    <input
                      value={dealValue}
                      onChange={(e) => setDealValue(e.target.value)}
                      inputMode="numeric"
                      className="mt-2 w-full h-11 rounded-xl border border-blue-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="10000000 (₹1 Cr)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Commission %</label>
                    <input
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(e.target.value)}
                      inputMode="decimal"
                      className="mt-2 w-full h-11 rounded-xl border border-blue-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="2.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900">Subscription tier (Launch)</label>
                    <select
                      value={roiPlan}
                      onChange={(e) => setRoiPlan(e.target.value as any)}
                      className="mt-2 w-full h-11 rounded-xl border border-blue-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="BASIC">Basic ({money(7999)}/year)</option>
                      <option value="PROFESSIONAL">Professional ({money(19999)}/year)</option>
                      <option value="PREMIUM">Premium ({money(39999)}/year)</option>
                    </select>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-200 p-4">
                    <div className="text-xs text-gray-600">Your commission</div>
                    <div className="mt-1 text-2xl font-bold text-dark-blue">{money(commission)}</div>
                    <div className="mt-1 text-xs text-gray-500">Based on deal value × commission %</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="grid grid-cols-1 gap-4">
                  <div className="rounded-2xl bg-white border border-blue-200 p-5">
                    <div className="text-xs text-gray-600">Subscription cost</div>
                    <div className="mt-1 text-2xl font-bold text-gray-900">{money(planCost)}</div>
                    <div className="mt-1 text-xs text-gray-500">Launch pricing • Annual billing</div>
                  </div>

                  <div className="rounded-2xl bg-white border border-blue-200 p-5">
                    <div className="text-xs text-gray-600">ROI</div>
                    <div className="mt-1 text-4xl font-bold text-dark-blue">{roiMultiple ? `${roiMultiple.toFixed(1)}x` : '—'}</div>
                    <div className="mt-2 text-sm text-gray-600">One extra deal per year can pay for 10+ years of subscription.</div>
                  </div>

                  <div className="rounded-2xl bg-white border border-gray-200 p-5">
                    <div className="text-sm font-semibold text-gray-900">Example</div>
                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div className="text-gray-600">Deal value</div>
                      <div className="text-gray-900 font-semibold">₹1 Cr</div>
                      <div className="text-gray-600">Commission (2.5%)</div>
                      <div className="text-gray-900 font-semibold">₹2,50,000</div>
                      <div className="text-gray-600">Professional</div>
                      <div className="text-gray-900 font-semibold">{money(19999)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pb-14">
          <h2 className="text-2xl font-serif font-bold text-dark-blue">Why Choose MillionFlats?</h2>
          <p className="mt-2 text-gray-600 text-sm">Benefits designed for working agents.</p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                title: 'Win More Listings',
                desc: 'Verix™ scores prove your listings are verified – sellers trust you more.',
              },
              {
                title: 'Close Deals Faster',
                desc: 'AI-matched leads are pre-qualified – less time chasing, more time closing.',
              },
              {
                title: 'Build Trust Instantly',
                desc: 'VerixPro™ badge shows clients your verified track record.',
              },
              {
                title: 'Save Time',
                desc: 'Automated lead scoring and WhatsApp integration.',
              },
              {
                title: 'Stand Out',
                desc: 'Premium profile placement attracts serious buyers.',
              },
            ].map((it) => (
              <div key={it.title} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-dark-blue font-bold">
                  MF
                </div>
                <div className="mt-4 font-semibold text-gray-900">{it.title}</div>
                <div className="mt-2 text-sm text-gray-600">{it.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-blue-50 border-y border-blue-100">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-3xl bg-white border border-blue-100 p-7">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-dark-blue font-semibold">Launch Offer (Limited Time)</div>
                <div className="mt-2 text-xl font-serif font-bold text-gray-900">Save 20% – India</div>
              </div>
              <a
                href="/agent/register"
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Choose Tier
              </a>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-blue-50 text-gray-700">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Market</th>
                    <th className="text-left font-semibold px-4 py-3">Tier</th>
                    <th className="text-left font-semibold px-4 py-3">Regular Price</th>
                    <th className="text-left font-semibold px-4 py-3">Launch Price</th>
                    <th className="text-left font-semibold px-4 py-3">Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['India', 'Basic', money(9999), money(7999), '20%'],
                    ['India', 'Professional', money(24999), money(19999), '20%'],
                    ['India', 'Premium', money(49999), money(39999), '20%'],
                  ].map((r, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-4 py-3 text-gray-700">{r[0]}</td>
                      <td className="px-4 py-3 text-gray-900 font-semibold">{r[1]}</td>
                      <td className="px-4 py-3 text-gray-600">{r[2]}</td>
                      <td className="px-4 py-3 text-dark-blue font-semibold">{r[3]}</td>
                      <td className="px-4 py-3 text-gray-700">{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14">
          <div id="how" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-7">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">FAQ</h2>
              <div className="mt-6 space-y-2">
                {FAQS.map((f, idx) => {
                  const open = openFaq === idx
                  return (
                    <div key={idx} className="rounded-2xl border border-gray-200 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? null : idx)}
                        className="w-full text-left px-5 py-4 bg-white hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span className="font-semibold text-gray-900">{f.q}</span>
                        <span className="text-dark-blue font-bold">{open ? '−' : '+'}</span>
                      </button>
                      {open ? <div className="px-5 pb-5 text-sm text-gray-600">{f.a}</div> : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-7">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">How to Subscribe</h2>
              <p className="mt-2 text-gray-600 text-sm">Fast onboarding in 5 steps.</p>

              <ol className="mt-6 space-y-3 text-sm text-gray-700">
                <li>
                  <span className="font-semibold text-gray-900">1.</span> Visit millionflats.com/agents
                </li>
                <li>
                  <span className="font-semibold text-gray-900">2.</span> Choose your tier
                </li>
                <li>
                  <span className="font-semibold text-gray-900">3.</span> Complete payment (secure gateway)
                </li>
                <li>
                  <span className="font-semibold text-gray-900">4.</span> Get instant access to your agent dashboard
                </li>
                <li>
                  <span className="font-semibold text-gray-900">5.</span> Start winning more listings today!
                </li>
              </ol>

              <div className="mt-6 space-y-3">
                <a
                  href="/agent/register"
                  className="inline-flex w-full items-center justify-center h-12 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
                >
                  Start 14-Day Free Trial
                </a>
                <a
                  href="/agent/login"
                  className="inline-flex w-full items-center justify-center h-12 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                >
                  Login as Agent
                </a>
              </div>

              <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-sm font-semibold text-gray-900">Questions? Contact Us</div>
                <div className="mt-3 text-sm text-gray-700">India: +91 9510155835</div>
                <div className="mt-1 text-sm text-gray-700">info@millionflats.com</div>
                <div className="mt-3 text-xs text-gray-600">Website: www.millionflats.com</div>
                <div className="mt-1 text-xs text-gray-600">Instagram: @millionflats</div>
                <div className="mt-1 text-xs text-gray-600 break-all">LinkedIn: https://www.linkedin.com/company/millionflats/</div>
              </div>

              <div className="mt-6 text-xs text-gray-500">By continuing, you agree to MillionFlats terms and compliance policies.</div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-6 border-b border-gray-200">
              <h2 className="text-2xl font-serif font-bold text-dark-blue">Terms Summary</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left font-semibold px-6 py-4">Term</th>
                    <th className="text-left font-semibold px-6 py-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['Billing', 'Annual only (monthly option coming soon)'],
                    ['Cancellation', 'Cancel anytime, no refunds for unused months'],
                    ['Trial', '14-day free trial (no credit card required)'],
                    ['Upgrades', 'Pro-rated upgrade anytime'],
                    ['Downgrades', 'At next renewal only'],
                  ].map((r, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-6 py-4 text-gray-900 font-medium">{r[0]}</td>
                      <td className="px-6 py-4 text-gray-700">{r[1]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-10 text-center text-sm text-gray-600">
            MillionFlats – India's Gateway to Dubai Real Estate. Official Corporate Agent of DAMAC Properties.
          </div>
        </div>
      </section>

      <section className="bg-dark-blue">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-3xl bg-white/5 border border-white/10 p-8 text-center">
            <div className="text-white font-serif font-bold text-3xl">Start Winning More Listings Today</div>
            <div className="mt-3 text-white/80">Tools that help you operate faster, with compliance enforced end-to-end.</div>
            <div className="mt-7 flex items-center justify-center">
              <a href="/agent/register" className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-white text-dark-blue font-semibold hover:bg-white/95">
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
