export const metadata = {
  title: 'AI Analytics (Verix™) - MillionFlats',
}

function CheckIcon({ className = "w-5 h-5", glow = false }) {
  return (
    <svg className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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

function money(n: number | string) {
  if (typeof n === 'string') return n;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function ServiceAIAnalyticsPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-200 selection:text-dark-blue flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-0 -left-64 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-200/50 to-purple-200/30 blur-[120px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-64 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-200/50 to-emerald-200/30 blur-[120px] mix-blend-multiply" />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full z-10 text-center lg:text-left flex flex-col lg:flex-row items-center gap-16">
        <div className="lg:w-1/2">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-white/70 backdrop-blur-md px-4 py-1.5 text-sm font-bold text-indigo-700 shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
            <span className="relative flex h-2.5 w-2.5 mr-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
            </span>
            Introducing Verix™ AI Engine
          </div>
          <h1 className="text-5xl sm:text-6xl font-serif font-extrabold text-dark-blue tracking-tight leading-[1.05]">
            Make Data-Backed <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">
              Property Decisions
            </span>
          </h1>
          <p className="mt-6 text-xl text-slate-600 leading-relaxed font-medium">
            Our Verix™ AI suite analyzes millions of data points to give you accurate pricing, investment forecasts, and risk assessment – so you never rely on guesswork again.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center lg:justify-start justify-center gap-4">
            <a href="/agents/pricing" className="group relative inline-flex items-center justify-center h-14 px-8 rounded-2xl bg-gradient-to-r from-dark-blue to-indigo-900 text-white font-extrabold overflow-hidden shadow-[0_10px_40px_rgba(30,58,138,0.3)] hover:shadow-[0_10px_40px_rgba(30,58,138,0.5)] hover:-translate-y-1 transition-all duration-300">
              Explore AI Tools
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </a>
            <a href="#pricing" className="inline-flex items-center justify-center h-14 px-8 rounded-2xl border-2 border-indigo-100 bg-white/50 backdrop-blur-sm text-indigo-900 font-bold hover:border-indigo-300 hover:bg-white transition-all duration-300">
              Pricing Plans
            </a>
          </div>
        </div>
        <div className="lg:w-1/2 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-emerald-500/10 rounded-[3rem] transform rotate-3 scale-105"></div>
          <div className="relative bg-white/80 backdrop-blur-xl border border-white p-8 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-5">
              <div className="font-bold text-slate-800 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                Verix™ Market Analysis
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">Live Data</div>
            </div>
            <div className="space-y-4">
              {[78, 92, 64].map((v, i) => (
                <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center gap-4 group hover:bg-indigo-50 transition-colors cursor-default">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {v}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{i === 0 ? 'Investment Potential' : i === 1 ? 'Pricing Fairness' : 'Agent Trust Score'}</div>
                    <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full w-24 overflow-hidden"><div className={`h-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${v}%` }}></div></div>
                      {v}/100
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trust Scores Details */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-20">
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <h2 className="text-sm font-bold tracking-widest text-indigo-600 uppercase mb-3">The Engine</h2>
          <h3 className="text-4xl font-serif font-extrabold text-dark-blue">What Is Verix™ AI Analytics?</h3>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed font-medium">
            Artificial intelligence is transforming real estate, and MillionFlats is at the forefront. Our proprietary Verix™ AI suite analyzes locality growth patterns, historical sales data, infrastructure projects, amenities, and market trends to generate accurate insights that would take humans weeks to compile .
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { key: 'view', title: 'VerixView™', subtitle: 'Authenticity', desc: 'Detects manipulated images and ensures the listing matches reality. Is the property exactly as presented?', icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', color: 'text-blue-600', bg: 'bg-blue-100/50' },
            { key: 'shield', title: 'VerixShield™', subtitle: 'Pricing Fairness', desc: 'Compares against 50+ localized data points to flag over-pricing or uncover severe under-pricing. Is this a good deal?', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', color: 'text-emerald-600', bg: 'bg-emerald-100/50' },
            { key: 'index', title: 'VerixIndex™', subtitle: 'Investment Potential', desc: 'Forecasts 1-5 year asset value based on infrastructure influx, demand, and micro-market trends. Will it appreciate?', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6', color: 'text-indigo-600', bg: 'bg-indigo-100/50' },
            { key: 'title', title: 'VerixTitle™', subtitle: 'Legal Safety', desc: 'Cross-references title records, municipal approvals, and litigation history to flag risks before you commit.', icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3', color: 'text-amber-600', bg: 'bg-amber-100/50' },
            { key: 'pro', title: 'VerixPro™', subtitle: 'Agent Performance', desc: 'Scores real estate agents on response time, closure rate, and client satisfaction. Who can you truly trust?', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-purple-600', bg: 'bg-purple-100/50' },
          ].map((s) => (
            <div key={s.key} className="group bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br from-slate-50 to-slate-100 rounded-full group-hover:scale-150 transition-transform duration-700 ease-out z-0"></div>
              <div className="relative z-10 flex flex-col h-full">
                <div className={`w-16 h-16 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-6 shadow-sm border border-white/50 backdrop-blur-sm group-hover:scale-110 transition-transform duration-300`}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={s.icon} /></svg>
                </div>
                <div className="font-bold text-slate-400 text-xs tracking-widest uppercase mb-1">{s.subtitle}</div>
                <h4 className="text-2xl font-bold text-slate-800 mb-3">{s.title}</h4>
                <p className="text-slate-600 font-medium leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features Table / Cards */}
      <section className="bg-white border-y border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-24 z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-extrabold text-dark-blue">Unmatched Analytical Power</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">Delivered directly via your agent dashboard or buyer portal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { t: 'Automated Valuation Model (AVM)', d: 'Get highly accurate property valuations delivered in seconds.' },
              { t: 'Neighborhood Heatmaps', d: 'Visually track price trends, rental demand, and infrastructural growth corridors geographically.' },
              { t: 'Comparable Market Analysis', d: 'Instant access to recent, similar property sales in your target micro-market.' },
              { t: 'Rental Yield Calculator', d: 'Project potential rental income based strictly on hyperlocal algorithmic data.' },
              { t: 'Risk Flagging', d: 'AI identifies legal, structural, or title risks long before you make a financial commitment.' },
            ].map((f, i) => (
              <div key={i} className="flex gap-6 p-6 rounded-3xl bg-slate-50 border border-slate-100 shadow-sm hover:shadow-md hover:bg-white transition-all group">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    {i + 1}
                  </div>
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800 mb-2">{f.t}</h4>
                  <p className="text-slate-600 font-medium leading-relaxed">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full py-24 z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-800 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <svg className="w-8 h-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              For Buyers
            </h3>
            <ul className="space-y-4 font-medium text-indigo-100">
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Never overpay – know the strictly fair market price instantly.</li>
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Identify undervalued properties before the wider market catches on.</li>
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Join the 80% of Indian buyers who now rely on online research before shortlisting.</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-emerald-900 to-teal-800 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <svg className="w-8 h-8 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              For Investors
            </h3>
            <ul className="space-y-4 font-medium text-emerald-100">
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Spot emerging neighborhoods exhibiting hyper-growth potential.</li>
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Forecast rental yields with unprecedented 85%+ accuracy.</li>
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Assemble and restructure portfolios based purely on data-driven signals.</li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-dark-blue to-blue-900 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <svg className="w-8 h-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              For Agents
            </h3>
            <ul className="space-y-4 font-medium text-blue-100">
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Win more listings by presenting data-backed pricing recommendations to sellers.</li>
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Build immediate trust through fully transparent analytics profiles.</li>
              <li className="flex items-start gap-3"><CheckIcon className="w-6 h-6 text-emerald-400 mt-0.5 flex-shrink-0" /> Close deals faster strictly interacting with pre-qualified, serious buyers.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Pricing Module */}
      <section id="pricing" className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-extrabold text-dark-blue tracking-tight">Agent Subscription Tiers</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">Analytics are bundled natively within our primary agent subscriptions.</p>
          </div>

          <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm">Subscription Plan</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200">Annual Sub</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200">Monthly Avg</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200">Ideal For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Basic', '₹9,999', '₹833/month', 'Individual agents, starters'],
                    ['Professional', '₹24,999', '₹2,083/month', 'Established agents, steady business'],
                    ['Premium', '₹49,999', '₹4,166/month', 'Top agents, small agencies'],
                  ].map((r, i) => (
                    <tr key={r[0]} className={`bg-white hover:bg-indigo-50/30 transition-colors ${i === 1 ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-8 py-6 text-slate-900 font-extrabold text-lg">{r[0]}</td>
                      <td className="px-8 py-6 border-l border-slate-100 font-bold text-indigo-700 text-lg">{r[1]}</td>
                      <td className="px-8 py-6 border-l border-slate-100 text-slate-600 font-medium">{r[2]}</td>
                      <td className="px-8 py-6 border-l border-slate-100 text-slate-600 font-medium">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-8 py-8 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-2xl font-serif font-extrabold text-dark-blue">AI Analytics Quotas & Features</h3>
              <span className="bg-indigo-100 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-inner">Included</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead className="bg-white border-b border-slate-200">
                  <tr>
                    <th className="text-left font-bold px-8 py-5 text-slate-800 w-1/4">Feature</th>
                    <th className="text-center font-bold px-6 py-5 text-slate-600 w-1/4">Basic</th>
                    <th className="text-center font-bold px-6 py-5 text-indigo-700 w-1/4 border-x border-slate-100 bg-indigo-50/30">Professional</th>
                    <th className="text-center font-bold px-6 py-5 text-slate-600 w-1/4">Premium</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['VerixView™ (Authenticity)', 'Basic', 'Full', 'Full + Priority'],
                    ['VerixShield™ (Pricing)', '-', 'Included', 'Included + Alerts'],
                    ['VerixIndex™ (Investment)', '-', 'Basic', 'Advanced'],
                    ['VerixPro™ Agent Score', 'Standard', 'Enhanced', 'Featured Badge'],
                    ['Property Valuations', '50/month', '200/month', 'Unlimited'],
                    ['Neighborhood Heatmaps', '-', 'Included', 'Included'],
                    ['Lead Alerts', 'Weekly', 'Daily', 'Real-time'],
                  ].map((row: any, idx) => {
                    const label = <span className="font-bold text-slate-800">{row[0]}</span>;
                    return (
                      <tr key={idx} className="bg-white hover:bg-slate-50/50 transition-colors text-center">
                        <td className="px-8 py-5 text-left">{label}</td>
                        <td className="px-6 py-5 font-medium text-slate-600">
                          {row[1] === '-' ? <CrossIcon className="w-5 h-5 text-slate-300 mx-auto" /> : row[1]}
                        </td>
                        <td className="px-6 py-5 font-bold text-indigo-800 border-x border-slate-100 bg-indigo-50/10">
                          {row[2] === '-' ? <CrossIcon className="w-5 h-5 text-slate-300 mx-auto" /> : (row[2] === 'Included' ? <CheckIcon className="w-5 h-5 text-indigo-600 mx-auto" glow /> : row[2])}
                        </td>
                        <td className="px-6 py-5 font-medium text-slate-600">
                          {row[3] === '-' ? <CrossIcon className="w-5 h-5 text-slate-300 mx-auto" /> : row[3]}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-14 flex flex-col sm:flex-row justify-center gap-5">
            <a href="/agents/pricing" className="inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-dark-blue text-white font-extrabold text-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              View Agent Subscription Plans
            </a>
            <a href="/contact" className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white text-dark-blue font-extrabold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all duration-300">
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* CTA Footer xl */}
      <section className="bg-dark-blue relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/30 to-emerald-500/10 pointer-events-none mix-blend-screen opacity-50"></div>
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 py-12 relative z-10 text-center">
          <h2 className="text-white font-serif font-extrabold text-4xl tracking-tight">Unlock Verix™ AI Tools</h2>
          <p className="mt-4 text-indigo-100/90 text-lg font-medium max-w-2xl mx-auto leading-relaxed">Upgrade your workflow with purely data-driven, proprietary AI insights. Activate your 30-day (1 month) free trial natively today.</p>
          <div className="mt-8 flex justify-center">
            <a href="/agents/pricing" className="inline-flex items-center justify-center h-14 px-10 rounded-2xl bg-white text-dark-blue font-bold text-lg hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-300">
              See All Plans
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
