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
    a: 'Yes. You can start a 30-day (1 month) free trial. No credit card required during early access.',
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
  return `₹${Math.round(n).toLocaleString('en-IN')}`
}

function CheckIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CrossIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
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
    if (roiPlan === 'BASIC') return 9999
    if (roiPlan === 'PREMIUM') return 49999
    return 24999
  }, [roiPlan])

  const roiMultiple = useMemo(() => {
    if (!commission) return 0
    return commission / planCost
  }, [commission, planCost])

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-200 selection:text-dark-blue flex flex-col relative overflow-hidden">

      {/* Abstract Background Elements */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-blue-100 opacity-50 blur-[100px]" />
      <div className="pointer-events-none absolute top-20 right-0 w-[500px] h-[500px] rounded-full bg-blue-50 opacity-40 blur-[120px]" />

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center z-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/50 bg-white/70 backdrop-blur-md px-4 py-1.5 text-sm text-dark-blue font-medium shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
          </span>
          AI-Powered Real Estate Tools for Smarter Selling
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-extrabold text-dark-blue tracking-tight leading-[1.1]">
          Smart Tools For <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-500">
            Smarter Selling
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Unlock AI-powered analytics, verified trust scores, and dynamic lead generation natively built into India’s fastest-growing real estate ecosystem.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/agent/register"
            className="group relative inline-flex items-center justify-center h-14 px-8 rounded-2xl bg-dark-blue text-white font-semibold overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(29,78,216,0.3)] transition-all duration-300"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
            <span className="relative flex items-center gap-2">
              Start 30-Day Free Trial
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </a>
          <a
            href="#compare"
            className="inline-flex items-center justify-center h-14 px-8 rounded-2xl border-2 border-slate-200 bg-white/50 backdrop-blur-sm text-dark-blue font-semibold hover:border-dark-blue/20 hover:bg-slate-50 transition-all duration-300"
          >
            Compare Plans
          </a>
        </div>
        <p className="mt-5 text-sm text-slate-500 font-medium tracking-wide">
          No credit card required. Cancel anytime.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch pt-8">

          {/* Basic */}
          <div className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xl font-bold text-dark-blue">Basic</h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-slate-900 tracking-tight">{money(9999)}</span>
              <span className="text-slate-500 font-medium">/year</span>
            </div>
            <p className="mt-2 text-sm font-medium text-indigo-600 bg-indigo-50 inline-block px-2 py-0.5 rounded-md w-fit">Equivalent to {money(833)}/month</p>
            <p className="mt-5 text-slate-600 leading-relaxed text-sm">Best for individual agents, starters.</p>

            <a href="/agent/register" className="mt-8 block w-full py-4 text-center rounded-xl bg-slate-50 text-dark-blue font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
              Choose Basic
            </a>
          </div>

          {/* Professional (Highlighted) */}
          <div className="group relative flex flex-col rounded-3xl border-2 border-blue-500 bg-white p-8 shadow-[0_20px_40px_rgb(0,0,0,0.08)] scale-100 lg:scale-[1.05] z-20 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="inline-flex items-center px-4 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold tracking-widest uppercase shadow-lg shadow-blue-500/30">
                Most Popular
              </span>
            </div>
            <h3 className="text-xl font-bold text-dark-blue">Professional</h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-slate-900 tracking-tight">{money(24999)}</span>
              <span className="text-slate-500 font-medium">/year</span>
            </div>
            <p className="mt-2 text-sm font-medium text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded-md w-fit">Equivalent to {money(2083)}/month</p>
            <p className="mt-5 text-slate-600 leading-relaxed text-sm">Best for established agents, steady business.</p>

            <a href="/agent/register" className="mt-8 block w-full py-4 text-center rounded-xl bg-dark-blue text-white font-bold shadow-md hover:shadow-lg hover:bg-blue-900 transition-all">
              Choose Professional
            </a>
          </div>

          {/* Premium */}
          <div className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xl font-bold text-dark-blue">Premium</h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-slate-900 tracking-tight">{money(49999)}</span>
              <span className="text-slate-500 font-medium">/year</span>
            </div>
            <p className="mt-2 text-sm font-medium text-emerald-600 bg-emerald-50 inline-block px-2 py-0.5 rounded-md w-fit">Equivalent to {money(4166)}/month</p>
            <p className="mt-5 text-slate-600 leading-relaxed text-sm">Best for top agents, small agencies needing VIP access.</p>

            <a href="/agent/register" className="mt-8 block w-full py-4 text-center rounded-xl bg-slate-50 text-dark-blue font-bold border border-slate-200 hover:bg-slate-100 transition-colors">
              Choose Premium
            </a>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section id="compare" className="px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full pb-24 z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue">Plan Comparison</h2>
          <p className="mt-3 text-slate-600">A detailed breakdown of every feature included in our tiers.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50/80 border-b border-slate-200 backdrop-blur-sm">
                <tr>
                  <th className="text-left font-semibold px-8 py-6 text-slate-900 w-1/4">Feature</th>
                  <th className="text-left font-bold px-6 py-6 text-slate-600 w-1/4 text-center">Basic</th>
                  <th className="text-left font-bold px-6 py-6 text-blue-700 w-1/4 border-x border-slate-200 bg-blue-50/40 text-center relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1 bg-blue-500"></div>
                    Professional
                  </th>
                  <th className="text-left font-bold px-6 py-6 text-slate-600 w-1/4 text-center">Premium</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { key: 'view', label: <span className="font-semibold text-slate-800">VerixView<sup>™</sup> (Authenticity)</span>, cols: ['Basic', 'Full', 'Full + Priority'], icon: true },
                  { key: 'shield', label: <span className="font-semibold text-slate-800">VerixShield<sup>™</sup> (Fair Pricing)</span>, cols: ['-', 'Included', 'Included + Alerts'], icon: true },
                  { key: 'index', label: <span className="font-semibold text-slate-800">VerixIndex<sup>™</sup> (Investment Potential)</span>, cols: ['-', 'Basic', 'Advanced'], icon: true },
                  { key: 'pro', label: <span className="font-semibold text-slate-800">VerixPro<sup>™</sup> Agent Score</span>, cols: ['Standard', 'Enhanced', 'Featured Badge'], icon: true },
                  ['Agent Profile', 'Standard', 'Featured', 'Premium + Verified'],
                  ['Listings Included', '20 properties', '100 properties', 'Unlimited'],
                  ['Lead Alerts', 'Weekly', 'Daily', 'Real-time'],
                  ['WhatsApp Integration', '-', 'Basic', 'Full + Automation'],
                  ['Ecosystem Partner Access', 'Basic', 'Preferred Rates', 'VIP Access'],
                  ['3D Tour Discount', '10% off', '25% off', '30% off'],
                  ['Support', 'Email', 'Priority Email', 'Dedicated WhatsApp'],
                ].map((row: any, idx) => {
                  const label = row.label || <span className="font-medium">{row[0]}</span>;
                  const c1 = row.cols ? row.cols[0] : row[1];
                  const c2 = row.cols ? row.cols[1] : row[2];
                  const c3 = row.cols ? row.cols[2] : row[3];

                  const renderCol = (val: string, highlight: boolean = false) => {
                    if (!val || val === '-') return <div className="flex justify-center"><CrossIcon className="text-slate-300 w-5 h-5" /></div>;
                    if (val === 'Included') return <div className="flex items-center justify-center gap-2"><CheckIcon className={highlight ? "text-blue-600" : "text-slate-400"} /> <span className="font-medium text-slate-600">{val}</span></div>;

                    return (
                      <div className="flex flex-col items-center justify-center gap-1 text-center">
                        <span className={highlight ? "font-bold text-blue-900" : "font-medium text-slate-600"}>{val}</span>
                      </div>
                    );
                  };

                  return (
                    <tr key={row.key || idx} className="bg-white hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 text-slate-900">{label}</td>
                      <td className="px-6 py-5 align-middle">{renderCol(c1)}</td>
                      <td className="px-6 py-5 align-middle border-x border-slate-100 bg-blue-50/10">
                        <div className="flex w-full h-full items-center justify-center">{renderCol(c2, true)}</div>
                      </td>
                      <td className="px-6 py-5 align-middle">{renderCol(c3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full pb-24 z-10">
        <div className="rounded-[2.5rem] bg-gradient-to-br from-dark-blue to-blue-900 p-[1px] shadow-2xl overflow-hidden">
          <div className="rounded-[calc(2.5rem-1px)] bg-white overflow-hidden flex flex-col lg:flex-row h-full">

            {/* Form Side */}
            <div className="p-10 lg:p-14 lg:w-1/2 flex flex-col justify-center bg-white relative">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[100px] -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

              <h2 className="text-3xl font-serif font-bold text-dark-blue">ROI Calculator</h2>
              <p className="mt-3 text-slate-600 text-lg">Calculate how quickly a MillionFlats subscription pays for itself.</p>

              <div className="mt-10 space-y-8">
                <div className="group">
                  <div className="flex justify-between mb-3 text-sm font-bold text-slate-800 uppercase tracking-wider">
                    <label>Average Deal Value</label>
                    <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{money(deal)}</span>
                  </div>
                  <input
                    type="range"
                    min="1000000"
                    max="50000000"
                    step="500000"
                    value={dealValue}
                    onChange={(e) => setDealValue(e.target.value)}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-colors"
                  />
                  <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium font-mono">
                    <span>₹10L</span>
                    <span>₹5Cr</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Commission %</label>
                  <div className="relative group">
                    <input
                      value={commissionPct}
                      onChange={(e) => setCommissionPct(e.target.value)}
                      inputMode="decimal"
                      className="w-full h-14 rounded-xl border border-slate-200 bg-slate-50 px-5 text-lg font-bold text-dark-blue focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-[inset_0_2px_4px_rgb(0,0,0,0.02)]"
                      placeholder="2.5"
                    />
                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400 font-bold group-focus-within:text-blue-500 transition-colors">%</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Subscription Tier</label>
                  <div className="relative">
                    <select
                      value={roiPlan}
                      onChange={(e) => setRoiPlan(e.target.value as any)}
                      className="w-full h-14 rounded-xl border border-slate-200 bg-slate-50 px-5 text-lg font-bold text-dark-blue focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-white transition-all appearance-none shadow-[inset_0_2px_4px_rgb(0,0,0,0.02)]"
                    >
                      <option value="BASIC">Basic ({money(9999)}/year)</option>
                      <option value="PROFESSIONAL">Professional ({money(24999)}/year)</option>
                      <option value="PREMIUM">Premium ({money(49999)}/year)</option>
                    </select>
                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Result Side */}
            <div className="bg-[#f8fafc] p-10 lg:p-14 lg:w-1/2 flex flex-col justify-center relative overflow-hidden border-t lg:border-t-0 lg:border-l border-slate-200/60">
              <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tr from-blue-100/50 to-indigo-100/50 rounded-full blur-[80px] -z-10 translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

              <div className="relative z-10 space-y-5">
                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-slate-200 flex justify-between items-center group hover:shadow-md hover:bg-white transition-all">
                  <div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Your Commission Cut</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded">Deal value × {pct}%</div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{money(commission)}</div>
                </div>

                <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-slate-200 flex justify-between items-center group hover:shadow-md hover:bg-white transition-all">
                  <div>
                    <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Annual Cost</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium bg-slate-100 inline-block px-2 py-0.5 rounded">Regular pricing</div>
                  </div>
                  <div className="text-3xl font-extrabold text-slate-800 tracking-tight">{money(planCost)}</div>
                </div>

                <div className="bg-gradient-to-br from-dark-blue to-blue-800 rounded-3xl p-8 lg:p-10 shadow-xl text-white transform hover:scale-[1.03] transition-transform duration-500 border border-blue-600/30">
                  <div className="text-blue-200 font-bold tracking-widest text-sm uppercase flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    Estimated Return on Investment
                  </div>
                  <div className="mt-4 text-7xl font-extrabold tracking-tighter drop-shadow-md">
                    {roiMultiple ? `${roiMultiple.toFixed(1)}x` : '—'}
                  </div>
                  <div className="mt-6 text-blue-100 text-[15px] leading-relaxed border-t border-blue-700/50 pt-6 font-medium">
                    Just <strong className="text-white bg-white/20 px-1.5 py-0.5 rounded">one extra deal</strong> per year covers your subscription cost for {Math.floor(roiMultiple || 0)} years.
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-24 z-10 text-center relative">
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-50/50 rounded-full mix-blend-multiply filter blur-[100px] opacity-70"></div>

          <h2 className="text-3xl lg:text-5xl font-serif font-bold text-dark-blue tracking-tight">Why Choose MillionFlats?</h2>
          <p className="mt-5 text-slate-600 max-w-2xl mx-auto text-lg leading-relaxed">Designed for ambitious agents who want to scale gracefully, build undeniable trust, and automate their lead flow.</p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 text-left">
            {[
              { t: 'Win More Listings', d: 'Verix™ scores prove your listings are verified – sellers trust you immediately over competitors.', i: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', bg: 'bg-emerald-100', text: 'text-emerald-700' },
              { t: 'Close Deals Faster', d: 'AI-matched leads are pre-qualified to shrink your closing cycle and eliminate dead ends.', i: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-blue-100', text: 'text-blue-700' },
              { t: 'Build Trust Base', d: 'VerixPro™ badge showcases your verified track record definitively to every buyer.', i: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', bg: 'bg-indigo-100', text: 'text-indigo-700' },
              { t: 'Save Valuable Time', d: 'Automated lead scoring and native WhatsApp integration puts follow-ups on autopilot.', i: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z', bg: 'bg-purple-100', text: 'text-purple-700' },
              { t: 'Stand Out Locally', d: 'Premium profile placement ensures you catch the eyes of serious, high-intent buyers first.', i: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', bg: 'bg-amber-100', text: 'text-amber-700' },
            ].map((it, idx) => (
              <div key={idx} className="group rounded-3xl border border-slate-100 bg-slate-50 p-6 hover:bg-white hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                <div className={`w-14 h-14 rounded-2xl ${it.bg} flex items-center justify-center ${it.text} group-hover:scale-110 transition-transform duration-500`}>
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={it.i} />
                  </svg>
                </div>
                <div className="mt-6 font-bold text-slate-900 text-lg leading-snug">{it.t}</div>
                <div className="mt-3 text-[15px] text-slate-600 leading-relaxed font-medium">{it.d}</div>
                <div className="absolute -bottom-2 -right-2 w-24 h-24 bg-gradient-to-br from-transparent to-slate-200 rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300 pointer-events-none blur-2xl"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ & Terms */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full py-24 z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12">

          <div className="lg:col-span-5 sticky top-10 self-start">
            <h2 className="text-4xl font-serif font-bold text-dark-blue tracking-tight">Got Questions?</h2>
            <p className="mt-4 text-slate-600 mb-8 text-lg leading-relaxed">Everything you need to know about billing, trials, and managing your agent status.</p>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-3xl p-8 border border-blue-100/50 shadow-sm relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-200 rounded-full mix-blend-multiply opacity-20 blur-xl"></div>
              <div className="font-extrabold text-blue-900 mb-4 flex items-center gap-3 text-lg">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                </div>
                Need human help?
              </div>
              <p className="text-[15px] text-slate-600 mb-6 font-medium">Our support team is active 24/7 dedicated to our agents.</p>

              <div className="space-y-4">
                <a href="mailto:info@millionflats.com" className="flex items-center gap-3 text-blue-700 font-bold hover:text-blue-900 transition-colors bg-white/60 p-3 rounded-xl hover:bg-white shadow-sm hover:shadow">
                  <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  info@millionflats.com
                </a>
                <a href="tel:+919510155835" className="flex items-center gap-3 text-blue-700 font-bold hover:text-blue-900 transition-colors bg-white/60 p-3 rounded-xl hover:bg-white shadow-sm hover:shadow">
                  <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  90811922211
                </a>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4 pt-2">
            {FAQS.map((f, idx) => {
              const open = openFaq === idx
              return (
                <div key={idx} className={`rounded-2xl border transition-all duration-300 ${open ? 'border-blue-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)]' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md'}`}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    className="w-full text-left px-8 py-6 flex items-center justify-between focus:outline-none group"
                  >
                    <span className={`font-bold text-lg transition-colors duration-300 pr-4 ${open ? 'text-blue-700' : 'text-slate-800 group-hover:text-blue-600'}`}>{f.q}</span>
                    <span className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${open ? 'bg-blue-100 text-blue-700 rotate-180' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-8 pb-8 text-slate-600 leading-relaxed text-[15px] font-medium">
                      {f.a}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="bg-dark-blue relative overflow-hidden mt-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent pointer-events-none"></div>

        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-24 relative z-10 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/20 text-blue-200 text-sm font-bold tracking-widest uppercase mb-6 border border-blue-400/30">Limited Availability</span>
          <h2 className="text-white font-serif font-extrabold text-5xl sm:text-6xl tracking-tight leading-[1.1]">Start Winning More <br className="hidden sm:block" />Listings Today</h2>
          <p className="mt-6 text-blue-100/90 text-[19px] max-w-2xl mx-auto leading-relaxed">Equip yourself with tools that allow you to operate faster, with compliance enforced end-to-end. Take control of your real estate career.</p>

          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5">
            <a href="/agent/register" className="inline-flex items-center justify-center h-16 w-full sm:w-auto px-10 rounded-2xl bg-white text-dark-blue font-extrabold text-lg tracking-wide hover:shadow-[0_0_40px_rgb(255,255,255,0.4)] hover:scale-105 transition-all duration-300">
              Start 30-Day Free Trial
            </a>
            <a href="/contact" className="inline-flex items-center justify-center h-16 w-full sm:w-auto px-10 rounded-2xl border-2 border-white/20 text-white font-bold text-lg hover:bg-white/10 hover:border-white/40 transition-all duration-300">
              Contact Sales
            </a>
          </div>

          <div className="mt-16 pt-8 border-t border-blue-800/60 text-blue-200/60 text-[13px] flex flex-col items-center gap-3">
            <span className="font-semibold uppercase tracking-wider">MillionFlats – India&apos;s Gateway to Dubai Real Estate. Official Corporate Agent of DAMAC Properties.</span>
            <div className="flex gap-4 font-medium">
              <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
              <span className="opacity-50">•</span>
              <a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
