import Link from 'next/link'

export const metadata = {
  title: 'Packers & Movers - MillionFlats Ecosystem',
  description: 'Find strictly verified relocation experts for a flawless, damage-free move locally or internationally.',
}

export default function PackersMoversPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-amber-200 selection:text-amber-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-yellow-100/40 to-amber-100/30 blur-[120px] mix-blend-multiply" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-0 pb-24 z-10 text-center flex flex-col items-center">
        
        {/* HORIZONTAL AD BANNER SPACE */}
        <div className="w-full h-[120px] sm:h-[180px] lg:h-[220px] xl:h-[300px] mb-14 rounded-3xl bg-slate-200/50 backdrop-blur-md overflow-hidden shadow-inner border border-slate-300 relative flex items-center justify-center group">
           <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse opacity-50 z-0"></div>
           <p className="relative z-20 text-slate-500 font-extrabold tracking-widest uppercase text-sm group-hover:scale-105 transition-transform drop-shadow-sm">Ad Banner Space</p>
        </div>

        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-amber-800 shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          Verified Logistics Network
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-extrabold text-[#1f2937] tracking-tight leading-[1.05] max-w-4xl mx-auto ">
          Relocate Stress-Free. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
            We Carry the Load.
          </span>
        </h1>
        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto ">
          Find completely verified relocation experts specializing in local, domestic, and international moves. Get accurate estimates and comprehensive transit insurance natively.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center justify-center gap-5 w-full sm:w-auto">
          <Link href="#estimator" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-gray-900 to-amber-900 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(245,158,11,0.3)] hover:shadow-[0_15px_50px_rgba(245,158,11,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center gap-3">
              Calculate Moving Cost
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </Link>
          <button className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-md text-slate-800 font-extrabold text-lg hover:border-amber-400 hover:bg-amber-50 transition-all duration-300 w-full sm:w-auto hover:-translate-y-1 shadow-sm hover:shadow-md">
            View Partner Directory
          </button>
        </div>

        </div>

      </section>

      {/* 2. THE MILLIONFLATS ADVANTAGE */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-20 border-t border-slate-200/50">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-widest uppercase border border-slate-200 mb-6 shadow-sm">
            Ecosystem Advantage
          </div>
          <h2 className="text-4xl font-sans font-extrabold text-[#1f2937] tracking-tight">
            Why Move Through <br className="hidden sm:block" />
            <span className="text-amber-600">MillionFlats?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: 'Verified Reliability', d: 'Every mover strictly undergoes intense multi-point background, fleet, and operational verification procedures.', i: '🚛' },
            { t: 'Zero Hidden Costs', d: 'Receive ironclad, transparent upfront quotations with absolutely no surprise surcharges on moving day perfectly.', i: '📄' },
            { t: 'Comprehensive Insurance', d: 'Opt for end-to-end robust damage declarations natively covering your most precious assets in intelligent transit.', i: '📦' },
            { t: 'Real-Time Tracking', d: 'Track domestic fleets absolutely seamlessly via GPS directly within the connected MillionFlats logistical platform.', i: '📍' },
          ].map((adv, i) => (
            <div key={i} className="group rounded-[2rem] bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(245,158,11,0.08)] hover:-translate-y-2 hover:border-amber-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl mb-6 shadow-sm border border-amber-100 group-hover:scale-110 transition-transform duration-300">
                {adv.i}
              </div>
              <h3 className="text-[17px] font-extrabold text-[#1f2937] mb-3 font-sans">{adv.t}</h3>
              <p className="text-[14px] font-medium text-slate-600 leading-relaxed">{adv.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SERVICES & ESTIMATOR EMBEDDED TOGETHER */}
      <section id="estimator" className="bg-[#1f2937] py-24 relative overflow-hidden shadow-inner">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20"></div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* The Services Intro */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold tracking-widest uppercase border border-amber-500/30 mb-6 shadow-sm">
                Logistics Scope
              </div>
              <h2 className="text-4xl sm:text-5xl font-sans font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
                Relocation Services for <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Any Distance.</span>
              </h2>

              <div className="space-y-4 mt-8">
                {[
                  { t: 'Local City Shifting', d: 'Fast, secure same-day intra-city relocation precisely using small or large specialized verified covered vehicles.' },
                  { t: 'Domestic Relocation', d: 'Inter-state moving leveraging massive national networks natively ensuring safe, absolutely timely long-haul delivery.' },
                  { t: 'International Moving', d: 'Global transit deeply including comprehensive custom clearances, heavy sea/air freight, and strict port-to-door delivery.' },
                  { t: 'Vehicle Transportation', d: 'Totally secure, strictly enclosed car and bike carriers ensuring absolutely zero-scratch nationwide transit natively.' }
                ].map((svc, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-[1.25rem] backdrop-blur-md hover:bg-white/10 transition-colors">
                    <h4 className="font-extrabold text-white text-[15px] mb-2">{svc.t}</h4>
                    <p className="text-[13px] text-amber-100/70 font-medium leading-relaxed">{svc.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* The Estimator */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 relative overflow-hidden group">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-orange-100 rounded-full blur-[80px] pointer-events-none opacity-60"></div>
              <h3 className="text-2xl font-extrabold text-[#1f2937] mb-2 relative z-10">Relocation Cost Estimator</h3>
              <p className="text-[13px] text-slate-500 font-medium mb-8">Calculate approximate logistics expenses flawlessly before booking safely.</p>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Move Scope</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-amber-500 font-medium transition-colors">
                    <option>1 BHK Apartment</option>
                    <option>2 BHK Apartment</option>
                    <option>3 BHK Apartment / Villa</option>
                    <option>Office Space</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-2">Moving From (City/Pin)</label>
                    <input type="text" placeholder="e.g. Mumbai" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-amber-500 font-medium transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-600 block mb-2">Moving To (City/Pin)</label>
                    <input type="text" placeholder="e.g. Bangalore" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-amber-500 font-medium transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Do you need premium packing?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="pack" className="w-4 h-4 text-amber-500 focus:ring-amber-500" defaultChecked />
                      <span className="text-sm font-medium text-slate-700">Yes, full packing</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="pack" className="w-4 h-4 text-amber-500 focus:ring-amber-500" />
                      <span className="text-sm font-medium text-slate-700">No, transport only</span>
                    </label>
                  </div>
                </div>
                <button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg hover:shadow-amber-500/30">
                  Generate Instant Estimate
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4 & 5. HOW IT WORKS & FEATURED */}
      <section className="bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">

          {/* How It Works */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-widest uppercase border border-slate-200 mb-6 shadow-sm">
              Process Flow
            </div>
            <h2 className="text-4xl font-sans font-extrabold text-[#1f2937] tracking-tight mb-10">How It Works</h2>

            <div className="space-y-6 relative">
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-amber-200 to-slate-200 z-0"></div>
              {[
                { n: '1', t: 'Request an Estimate', d: 'Provide strict shifting details intelligently via our calculator to aggressively receive initial comprehensive quotations.' },
                { n: '2', t: 'Pre-Move Survey', d: 'Verified executives perform a frictionless AI or physical accurate survey to fundamentally freeze your strict quotation safely.' },
                { n: '3', t: 'Pack & Load intelligently', d: 'Partners completely utilize absolute triple-layer premium packing strictly loading assets safely organically natively.' },
                { n: '4', t: 'Unload & Settle flawlessly', d: 'Timely GPS-tracked delivery flawlessly guarantees unpacking and primary furniture assembly comprehensively seamlessly.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 items-start relative z-10 group cursor-default">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-amber-400 shadow-md flex items-center justify-center font-extrabold text-amber-600 text-lg group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all flex-shrink-0">
                    {step.n}
                  </div>
                  <div className="pt-2 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-100/0 hover:border-slate-200 transition-colors w-full">
                    <h4 className="font-extrabold text-[#1f2937] text-lg mb-1">{step.t}</h4>
                    <p className="text-[14px] text-slate-600 font-medium leading-relaxed">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Partners */}
          <div>
            <div className="flex justify-between items-end mb-10">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold tracking-widest uppercase border border-amber-200 mb-6 shadow-sm">
                  Top Logistics
                </div>
                <h2 className="text-4xl font-sans font-extrabold text-[#1f2937] tracking-tight">Featured Partners</h2>
              </div>
            </div>

            <div className="space-y-5">
              {[
                { n: 'Agarwal Packers (APML)', tag: 'Largest National Fleet', rat: '4.8/5' },
                { n: 'Porter Movers', tag: 'Fast Local Relocation', rat: '4.7/5' },
                { n: 'Pikkol Logistics', tag: 'Premium Tech-Driven Moves', rat: '4.9/5' },
              ].map((des, i) => (
                <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-lg hover:border-amber-300 transition-all group flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5 w-full">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-3xl shadow-inner shrink-0 group-hover:bg-amber-50 transition-colors">
                      📦
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#1f2937] text-lg">{des.n}</h4>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{des.tag}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end w-full sm:w-auto gap-3">
                    <div className="text-[12px] font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-1">
                      ⭐ {des.rat}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center sm:text-left">
              <Link href="#directory" className="text-amber-600 font-bold hover:text-amber-700 hover:underline flex items-center sm:justify-start justify-center gap-2">
                Explore Full Relocation Directory <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PARTNER DIRECTORY & FILTER */}
      <section id="directory" className="bg-white py-24 border-y border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-sans font-extrabold text-[#1f2937] tracking-tight">Verified Movers Directory</h2>
              <p className="text-slate-500 font-medium mt-2">Filter visually to strictly find exact logistical capacity specifically handling your destination.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 font-semibold w-full sm:w-auto">
                <option>Service Area</option>
                <option>Local (Intra-city)</option>
                <option>Domestic (Inter-state)</option>
                <option>International</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-amber-500 font-semibold w-full sm:w-auto">
                <option>Specialization</option>
                <option>Residential Shifting</option>
                <option>Vehicle Transport</option>
                <option>Corporate/Office Move</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'ShiftSafe Logistics', tag: 'Interstate Specialists', loc: 'Pan India' },
              { name: 'Metro Movers HQ', tag: 'Local Apartment Shifting', loc: 'Mumbai, Pune' },
              { name: 'Global Freight Packers', tag: 'Intl Customs & Shipping', loc: 'Global Ports' },
              { name: 'Leo Packers', tag: 'Premium Furniture Padding', loc: 'Pan India' },
              { name: 'V-Trans Logistics', tag: 'Corporate Relocations', loc: 'Tier 1 Cities' },
              { name: 'AutoMove Care', tag: 'Enclosed Vehicle Transit', loc: 'Pan India' },
            ].map((firm, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-6 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-amber-300 transition-all group flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:bg-amber-100 transition-colors">
                    🚚
                  </div>
                  <span className="bg-[#1f2937] text-amber-400 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 shadow-sm">
                    Verified
                  </span>
                </div>

                <div className="flex-1">
                  <h4 className="font-extrabold text-[#1f2937] text-xl mb-1">{firm.name}</h4>
                  <p className="text-sm font-semibold text-amber-600 mb-6">{firm.tag}</p>
                </div>

                <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Coverage</div>
                    <div className="text-sm font-extrabold text-[#1f2937]">{firm.loc}</div>
                  </div>
                  <button className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-4 py-2 rounded-xl text-sm hover:bg-amber-600 hover:text-white transition-colors">
                    Get Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. EDUCATIONAL RESOURCES */}
      <section className="bg-slate-50 py-24 border-b border-slate-200 text-center">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-sans font-extrabold text-[#1f2937] tracking-tight mb-4">The Ultimate Moving Hub</h2>
          <p className="text-slate-600 font-medium mb-12">Educate yourself flawlessly before transporting completely strictly all your massive physical capital.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { t: 'The 30-Day Moving Checklist', d: 'A perfectly comprehensive strict guide to packing schedules effectively ensuring absolutely zero transit panic organically.' },
              { t: 'Decoding Transit Insurance', d: 'Understand transit declaration absolutely deeply comparing comprehensive versus specifically declared value protection.' },
              { t: 'How to Prevent Furniture Damage', d: 'Ensure your mover actively strictly utilizes intelligent bubble wrap padding and robust corrugated sheet layering methodologies.' },
            ].map((art, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)] hover:border-amber-200 transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-amber-500 mb-6 group-hover:bg-amber-100 transition-colors border border-slate-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h4 className="font-extrabold text-[#1f2937] text-lg mb-2">{art.t}</h4>
                <p className="text-[14px] text-slate-500 font-medium leading-relaxed mb-4">{art.d}</p>
                <a href="#" className="text-amber-600 font-bold text-sm tracking-wide hover:underline inline-flex items-center gap-1 group-hover:gap-2 transition-all">Read Insight <span>&rarr;</span></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA & PARTNER BRIDGING */}
      <section className="bg-[#1f2937] py-24 text-center relative overflow-hidden">
        <div className="absolute top-0 right-1/2 w-[600px] h-[600px] bg-amber-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>

        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Your next chapter starts with <br />a seamless move.
          </h2>
          <p className="text-amber-100/80 text-lg font-medium leading-relaxed mb-12">
            Relocate your precious massive assets intelligently leveraging completely absolutely strict verified logistics seamlessly deeply natively on MillionFlats.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pb-16 border-b border-gray-700/50">
            <Link href="#estimator" className="group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(245,158,11,0.4)] hover:-translate-y-1 w-full sm:w-auto overflow-hidden relative">
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              Book Verified Movers
            </Link>
          </div>

          {/* Partner CTA seamlessly embedded below */}
          <div className="pt-16 max-w-2xl mx-auto">
            <div className="inline-block bg-gray-800 text-amber-400 px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase border border-gray-700 mb-4">
              Logistics Fleet Network
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Become a Verified Logistics Partner</h3>
            <p className="text-gray-400 text-sm font-medium mb-6">
              Access completely exclusive high-tier absolutely verified customers instantly moving within MillionFlats&apos; premium ecosystem perfectly scaling your strictly vast fleet.
            </p>
            <Link href="https://millionflats.com/ecosystem/register/packers-movers" className="text-amber-500 hover:text-white font-extrabold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
              Submit Fleet Application <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
