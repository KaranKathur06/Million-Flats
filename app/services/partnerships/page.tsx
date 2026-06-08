export const metadata = {
  title: 'Partnerships - MillionFlats',
}

function CheckIcon({ className = "w-5 h-5", glow = false }) {
  return (
    <svg className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function ServicePartnershipsPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-emerald-200 selection:text-emerald-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-5%] -left-32 w-[700px] h-[700px] rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/20 blur-[120px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-100/40 to-blue-100/30 blur-[120px] mix-blend-multiply" />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 backdrop-blur-md px-5 py-2 text-sm font-extrabold text-emerald-700 shadow-sm mb-10 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          Exclusive Corporate & Vendor Partnerships
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-extrabold text-dark-blue tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Partner with MillionFlats <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
            Grow Your Business
          </span>
        </h1>

        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto">
          Join India’s most strictly verified real estate ecosystem. Connect dynamically with thousands of active buyers, elite sellers, and deep-pocketed investors the exact moment they need your services.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto">
          <a href="#pricing" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-dark-blue to-emerald-900 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(6,95,70,0.3)] hover:shadow-[0_15px_50px_rgba(6,95,70,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="relative z-10 flex items-center gap-3">
              Become a Paid Partner
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </a>
          <a href="#benefits" className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-md text-slate-800 font-extrabold text-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all duration-300 w-full sm:w-auto">
            How It Works
          </a>
        </div>
      </section>

      {/* Grid Features */}
      <section id="benefits" className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-16">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-extrabold text-dark-blue tracking-tight">Ecosystem Privileges</h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">As a verified MillionFlats partner, you unlock unprecedented access to high-intent traffic securely.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { t: 'Qualified Lead Flow', d: 'Receive purely pre-screened customers actively transacting in real-time. No dead ends.', ic: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { t: 'Exclusive Verified Badge', d: 'Build irrefutable instant credibility locally with our trademarked digital trust mark.', ic: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
            { t: 'High-Visibility Profiling', d: 'Get featured dynamically natively in our strictly curated vendor partner directory.', ic: 'M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z' },
            { t: 'Data-Rich Partner Panel', d: 'Track leads, analyze conversion performance mathematically, and manage payments natively.', ic: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
            { t: 'Co-Marketing Power', d: 'Unlock joint webinars, physical events, and extensive content syndication collaborations.', ic: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
            { t: 'First Access Engineering', d: 'Beta test our newest strictly proprietary API/AI tools before absolute public market launch.', ic: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4' },
          ].map((b, i) => (
            <div key={i} className="group bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-[0_20px_40px_rgba(16,185,129,0.06)] hover:-translate-y-2 hover:border-emerald-200 transition-all duration-300 relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={b.ic} /></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{b.t}</h3>
              <p className="text-[15px] font-medium text-slate-600 leading-relaxed">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Target Audience Categories */}
      <section className="bg-dark-blue relative overflow-hidden text-center py-20 px-4 sm:px-6 lg:px-8 shadow-inner my-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNykiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none opacity-50"></div>
        <div className="max-w-[1240px] mx-auto relative z-10">
          <h2 className="text-3xl lg:text-4xl font-serif font-extrabold text-white mb-12">Who Should Apply For Partnerships?</h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              ['Home Loans & Finance', 'Banks, NBFCs, Housing Finance'],
              ['Legal & Documentation', 'Law Firms, Notaries, Specialists'],
              ['Property Insurance', 'Insurance Providers, Top Brokers'],
              ['Interior Design', 'Design Firms, Contractors, Kitchen Brands'],
              ['Packers & Movers', 'Relocation Logistics Providers'],
              ['Property Management', 'End-to-end Rental Operations'],
              ['Vastu / Feng Shui', 'Consultants & Senior Practitioners']
            ].map((c, i) => (
              <div key={i} className="bg-white/10 border border-white/20 backdrop-blur-md px-6 py-4 rounded-2xl hover:bg-white/20 transition-colors text-left group">
                <div className="font-extrabold text-white text-[15px] group-hover:text-emerald-300 transition-colors mb-1">{c[0]}</div>
                <div className="font-medium text-emerald-100 text-[13px]">{c[1]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Onboarding */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full py-16 z-10">
        <div className="bg-white rounded-[3rem] p-10 lg:p-16 border border-slate-200 shadow-[0_20px_60px_rgba(0,0,0,0.03)] text-center relative overflow-hidden">
          <div className="absolute top-0 right-1/2 w-64 h-64 bg-teal-100 rounded-full blur-[80px]" />

          <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-dark-blue relative z-10">Strict Verification Workflow</h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-[17px] font-medium mb-12 relative z-10">We strictly limit partnerships to ensure extreme high quality.</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
            {[
              { s: '1', t: 'Apply Directly', d: 'Fill out the secure partner application framework.' },
              { s: '2', t: 'Verification', d: 'Our compliance team heavily reviews credentials.' },
              { s: '3', t: 'Agreement', d: 'Sign SLA mapping exact deliverables securely.' },
              { s: '4', t: 'Onboarding', d: 'Unlock dashboard & start fielding leads natively.' },
            ].map((st, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center hover:bg-teal-50 hover:border-teal-200 transition-colors hover:-translate-y-1">
                <div className="mx-auto w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-extrabold text-xl mb-4">
                  {st.s}
                </div>
                <h4 className="text-[17px] font-bold text-slate-900 mb-2">{st.t}</h4>
                <p className="text-slate-600 text-sm font-medium leading-relaxed">{st.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Module */}
      <section id="pricing" className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-extrabold text-dark-blue tracking-tight">India Licensing - Partnerships</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-[17px] font-medium">Clear flat-fee thresholds delivering extreme ROI efficiency.</p>
          </div>

          <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead className="bg-[#f8fafc] border-b border-slate-200">
                  <tr>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm">Partner Tier</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200 bg-emerald-50/50">Annual Fee (₹)</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200">Lead Allocation</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200">Best For</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Basic Partner Protocol', '₹9,999', 'Up to 50 leads/year directly', 'Individual professionals, freelancers'],
                    ['Preferred Partner', '₹24,999', 'Up to 200 leads/year heavily driven', 'Small firms, hyper-growing business'],
                    ['Strategic Alliance', '₹49,999', 'Unlimited uncapped algorithm leads', 'Large enterprises, tier-1 banks'],
                    ['Enterprise Deployment', 'Custom', 'Customized national allocation', 'National chains, multiple locations'],
                  ].map((r, i) => (
                    <tr key={i} className={`bg-white hover:bg-emerald-50/20 transition-colors group ${i === 2 ? 'bg-emerald-50/10' : ''}`}>
                      <td className="px-8 py-6 text-slate-900 font-extrabold text-[15px]">{r[0]}</td>
                      <td className="px-8 py-6 border-l border-slate-100 font-extrabold text-emerald-700 text-xl bg-emerald-50/10">{r[1]}</td>
                      <td className="px-8 py-6 border-l border-slate-100 font-bold text-slate-700">{r[2]}</td>
                      <td className="px-8 py-6 border-l border-slate-100 text-slate-600 font-medium">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-[2px] shadow-xl hover:shadow-2xl transition-shadow duration-300 max-w-4xl mx-auto transform hover:-translate-y-1">
            <div className="bg-slate-900 rounded-[calc(1.5rem-2px)] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 text-white relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500 rounded-full blur-[40px] opacity-20 pointer-events-none"></div>
              <div className="flex items-center gap-6 relative z-10 w-full mb-6 md:mb-0">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white flex-shrink-0 border border-white/20">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h4 className="text-2xl font-extrabold text-white tracking-wide">Strict Revenue Share Alternative</h4>
                  <p className="text-emerald-100 font-medium mt-2 leading-relaxed">For high-volume partners demanding zero initial capital, we legally offer a 10–20% direct revenue extraction on purely closed transactions directly bypassing annual fees entirely.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col sm:flex-row justify-center gap-5">
            <a href="/partnerships" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl bg-dark-blue text-white font-extrabold text-lg shadow-lg hover:shadow-[0_10px_40px_rgba(30,58,138,0.3)] hover:-translate-y-1 transition-all duration-300">
              Apply For Partnership
            </a>
            <a href="/agents/pricing" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl border-2 border-slate-200 bg-white text-dark-blue font-extrabold text-lg hover:bg-slate-50 transition-all duration-300">
              Agent Access (30-Day Free Trial)
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-dark-blue py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden mt-auto border-t border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/40 to-dark-blue/80 pointer-events-none mix-blend-screen opacity-90"></div>
        <div className="absolute right-0 top-0 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[150px] mix-blend-multiply opacity-20 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-bold tracking-widest uppercase mb-6 border border-emerald-400/30">Network Expanding Rapidly</span>
          <h2 className="text-white font-serif font-extrabold text-5xl sm:text-6xl tracking-tight leading-tight">Become an Exclusive <br className="hidden sm:block" />Trusted Partner</h2>
          <p className="text-emerald-100/90 mt-6 text-xl font-medium max-w-2xl mx-auto leading-relaxed">Embed your services directly inside MillionFlats workflows precisely exactly when property buyers and sellers aggressively need them.</p>

          <div className="mt-12 flex justify-center">
            <a href="/partnerships" className="inline-flex items-center justify-center h-16 px-14 rounded-2xl bg-white text-dark-blue font-extrabold text-lg shadow-[0_0_40px_rgba(255,255,255,0.4)] hover:scale-105 transition-all duration-300">
              Apply Officially Now
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
