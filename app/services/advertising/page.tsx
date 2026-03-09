export const metadata = {
  title: 'Premium Ads - MillionFlats',
}

function CheckIcon({ className = "w-5 h-5", glow = false }) {
  return (
    <svg className={`${className} ${glow ? 'drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function ServiceAdvertisingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-purple-200 selection:text-purple-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-10%] -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-200/40 to-indigo-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-pink-100/40 to-rose-100/30 blur-[120px] mix-blend-multiply" />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-purple-700 shadow-sm mb-10 transition-transform hover:scale-105 duration-300">
          <svg className="w-5 h-5 text-purple-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Reach India's Fastest-Growing Real Estate Audience
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-extrabold text-dark-blue tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Capture Thousands of <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500">
            High-Intent Buyers
          </span>
        </h1>

        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto">
          Targeted hyper-local advertising visually dominating India’s most strictly verified PropTech platform. Display your brand unequivocally to investors, NRIs, and active homebuyers.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto">
          <a href="#pricing" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-dark-blue to-purple-900 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(88,28,135,0.3)] hover:shadow-[0_15px_50px_rgba(88,28,135,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="relative z-10 flex items-center gap-3">
              Advertise With Us
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </a>
          <a href="#options" className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-md text-slate-800 font-extrabold text-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 w-full sm:w-auto">
            View Ad Placements
          </a>
        </div>
      </section>

      {/* Stats/Audience Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-extrabold text-dark-blue">Why Advertise on MillionFlats?</h2>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">Unlike generic portals, our audience strictly consists of verified buyers, elite agents, and deep-pocketed investors.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { val: '50,000+', lbl: 'Monthly Active Users', sub: '65% Male, 35% Female', ic: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
            { val: '15,000+', lbl: 'NRI Visitors', sub: 'UAE, USA, UK, Canada, SG', ic: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { val: '8,000+', lbl: 'Verified Agent/Devs', sub: 'Decision-Makers Actively Listing', ic: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
            { val: '8.5 Min', lbl: 'Avg Session Duration', sub: 'Highly Engaged Audience', ic: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-slate-100 hover:shadow-lg hover:-translate-y-2 transition-all duration-300 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-6 border border-purple-100 group-hover:bg-purple-100 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={s.ic} /></svg>
              </div>
              <div className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none mb-2">{s.val}</div>
              <div className="text-[17px] font-bold text-dark-blue mb-1">{s.lbl}</div>
              <div className="text-sm font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 inline-block mt-3">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Ad Options */}
      <section id="options" className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-16">
        <div className="bg-gradient-to-br from-white to-slate-50 rounded-[3rem] p-4 sm:p-10 border border-slate-200 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-purple-100/60 to-transparent rounded-full blur-[80px] z-0 pointer-events-none"></div>

          <div className="relative z-10 mb-10 text-center">
            <h2 className="text-4xl font-serif font-extrabold text-dark-blue tracking-tight">Diverse Advertising Placements</h2>
            <p className="mt-4 text-slate-600 text-lg font-medium">Select omni-channel options designed explicitly to match strict conversion intents.</p>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { t: 'Homepage Hero Banner', d: 'Absolute premium placement at the very top of the MillionFlats homepage.', u: 'Brand Awareness, New Heavyweight Project Launches', ic: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
              { t: 'Category Page Takeover', d: 'Stunning native banners natively embedded in search results and active property listing pages.', u: 'Targeting Active, High-Intent Property Seekers', ic: 'M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z' },
              { t: 'Newsletter Sponsorship', d: 'Prominently featured strictly in our heavily-opened weekly email drops to 10,000+ elite subscribers.', u: 'Direct Communication With an Affluent Engaged Audience', ic: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
              { t: 'WhatsApp Native Broadcast', d: 'Dedicated promotional messaging routed securely via automated WhatsApp protocols to vetted agent & investor groups.', u: 'Immediate Unprecedented Reach, Highest Open Rates Locally', ic: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
              { t: 'Social Media Viral Takeover', d: 'Highly curated dedicated posts on Instagram & LinkedIn leveraging our strict 100K+ reach capabilities.', u: 'Uncapped Viral Potential, Irrefutable Market Brand Building', ic: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
            ].map((o, i) => (
              <div key={i} className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg hover:border-purple-200 transition-all group">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 flex-shrink-0 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={o.ic} /></svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2">{o.t}</h3>
                    <p className="text-[15px] font-medium text-slate-600 leading-relaxed mb-4">{o.d}</p>
                    <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
                      <span className="text-xs font-bold uppercase tracking-widest text-purple-700 block mb-1">Best Protocol For</span>
                      <span className="text-sm font-semibold text-slate-700">{o.u}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Modules */}
      <section id="pricing" className="bg-slate-50 border-t border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-24 z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-extrabold text-dark-blue tracking-tight">Premium Media Rates (India)</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">Clear, performance-driven caps guaranteeing absolute impression counts.</p>
          </div>

          <div className="rounded-[2.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-base">
                <thead className="bg-slate-100/80 border-b border-slate-200 backdrop-blur-sm">
                  <tr>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm">Media Asset Type</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200">Burst Duration</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200 bg-purple-50/50">Capital (₹)</th>
                    <th className="text-left font-bold px-8 py-6 text-slate-800 uppercase tracking-widest text-sm border-l border-slate-200">Impression Target (Min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y-0 text-slate-700">
                  {[
                    { category: 'Homepage Banner', plans: [{ duration: '1 Week', price: '₹15,000', impressions: '25,000' }, { duration: '1 Month', price: '₹45,000', impressions: '1,00,000', save: 'save 25%' }] },
                    { category: 'Category Page Banner', plans: [{ duration: '1 Month', price: '₹25,000', impressions: '50,000' }] },
                    { category: 'Newsletter Sponsorship', plans: [{ duration: 'Single Issue', price: '₹12,000', impressions: '10,000 strict opens' }, { duration: '4 Consecutive Issues', price: '₹40,000', impressions: '40,000 strict opens', save: 'save 17%' }] },
                    { category: 'WhatsApp Broadcast', plans: [{ duration: 'Single Broadcast Flight', price: '₹8,000', impressions: '5,000+ deep reach' }, { duration: '4 Phased Broadcasts', price: '₹28,000', impressions: '20,000+ deep reach', save: 'save 12%' }] },
                    { category: 'Social Media Takeover', plans: [{ duration: '1 Day Blitz', price: '₹20,000', impressions: '50,000+ verified reach' }, { duration: '1 Week Campaign', price: '₹1,20,000', impressions: '3,50,000+ verified reach', save: 'save 14%' }] }
                  ].flatMap((asset, i) =>
                    asset.plans.map((plan, j) => (
                      <tr key={`${i}-${j}`} className="bg-white hover:bg-purple-50/20 transition-colors group border-b border-slate-100 last:border-0">
                        {j === 0 && (
                          <td
                            rowSpan={asset.plans.length}
                            className="px-8 py-6 text-slate-900 font-extrabold text-[15px] align-middle bg-white group-hover:bg-slate-50 transition-colors border-r border-slate-100/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
                              </span>
                              {asset.category}
                            </div>
                          </td>
                        )}
                        <td className="px-8 py-6 border-l border-slate-100 font-medium text-slate-700 text-[15px] whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {plan.duration}
                          </div>
                        </td>
                        <td className="px-8 py-6 border-l border-slate-100 font-extrabold text-purple-700 text-lg bg-purple-50/10">
                          <div className="flex items-center gap-3">
                            {plan.price}
                            {plan.save && <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md inline-flex items-center shadow-sm">{plan.save}</span>}
                          </div>
                        </td>
                        <td className="px-8 py-6 border-l border-slate-100 text-slate-700 font-semibold">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {plan.impressions}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-12 bg-dark-blue rounded-3xl p-[2px] shadow-xl hover:shadow-2xl transition-shadow duration-300 max-w-4xl mx-auto transform hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 opacity-50 blur-lg"></div>
            <div className="bg-slate-900 rounded-[calc(1.5rem-2px)] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10 border border-white/20">
              <div className="flex items-center gap-6 text-white text-left">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white flex-shrink-0 border border-white/30 backdrop-blur-md">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                </div>
                <div>
                  <h4 className="text-2xl font-extrabold text-white tracking-wide">Custom Enterprise Campaigns</h4>
                  <p className="text-slate-300 font-medium mt-2 leading-relaxed">Require total local dominance? Contact us for highly-tailored enterprise packages strictly combining multiple aggressive channels.</p>
                </div>
              </div>
              <div className="flex-shrink-0">
                <a href="/contact" className="inline-flex items-center justify-center h-14 px-8 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-extrabold whitespace-nowrap shadow-lg hover:opacity-90 transition-opacity">
                  Request Custom Quote
                </a>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col sm:flex-row justify-center gap-5">
            <a href="/contact" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl bg-dark-blue text-white font-extrabold text-lg shadow-lg hover:shadow-[0_10px_40px_rgba(30,58,138,0.3)] hover:-translate-y-1 transition-all duration-300">
              Request a Media Kit
            </a>
            <a href="/contact" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl border-2 border-slate-200 bg-white text-dark-blue font-extrabold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all duration-300">
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-dark-blue py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/60 to-indigo-900/80 pointer-events-none mix-blend-screen opacity-90"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)]"></div>

        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-white font-serif font-extrabold text-5xl sm:text-6xl tracking-tight leading-tight">Execute a Zero-Waste <br />Premium Campaign</h2>
          <p className="text-indigo-200 mt-6 text-xl font-medium max-w-2xl mx-auto leading-relaxed">Reach strictly high-intent luxury buyers actively researching properties on MillionFlats right exactly now. No ghost leads.</p>

          <div className="mt-12 flex flex-col sm:flex-row justify-center gap-5">
            <a href="/contact" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl bg-white text-dark-blue font-extrabold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300">
              Initiate Contract
            </a>
            <a href="/agents/pricing" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl border border-white/30 text-white font-extrabold text-lg hover:bg-white/10 transition-all duration-300">
              View Normal Agent Subscriptions (30-Day Free Trial)
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
