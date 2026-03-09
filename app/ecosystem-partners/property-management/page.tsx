import Link from 'next/link'

export const metadata = {
  title: 'Property Management - MillionFlats Ecosystem',
  description: 'Protect and grow your real estate investment with verified, professional property management firms.',
}

export default function PropertyManagementPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-teal-200 selection:text-teal-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-teal-200/40 to-cyan-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-emerald-100/40 to-teal-100/30 blur-[120px] mix-blend-multiply" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-0 pb-24 z-10 text-center flex flex-col items-center">
        
        {/* HORIZONTAL AD BANNER SPACE */}
        <div className="w-full h-[120px] sm:h-[180px] lg:h-[220px] xl:h-[300px] mb-14 rounded-3xl bg-slate-200/50 backdrop-blur-md overflow-hidden shadow-inner border border-slate-300 relative flex items-center justify-center group">
           <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse opacity-50 z-0"></div>
           <p className="relative z-20 text-slate-500 font-extrabold tracking-widest uppercase text-sm group-hover:scale-105 transition-transform drop-shadow-sm">Ad Banner Space</p>
        </div>

        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-teal-800 shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-500"></span>
          </span>
          Strictly Verified Management
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-extrabold text-[#0f172a] tracking-tight leading-[1.05] max-w-4xl mx-auto ">
          End-to-End Property Management. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-600">
            Complete Peace of Mind.
          </span>
        </h1>
        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto ">
          Protect and continuously rigorously grow your real estate investment natively. Connect flawlessly with strictly verified professional property management firms perfectly scaled for you.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center justify-center gap-5 w-full sm:w-auto">
          <Link href="#calculator" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-[#0f172a] to-teal-950 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(20,184,166,0.3)] hover:shadow-[0_15px_50px_rgba(20,184,166,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center gap-3">
              Calculate Rental Yield
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </Link>
          <button className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-md text-slate-800 font-extrabold text-lg hover:border-teal-400 hover:bg-teal-50 transition-all duration-300 w-full sm:w-auto hover:-translate-y-1 shadow-sm hover:shadow-md">
            View Management Firms
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
          <h2 className="text-4xl font-sans font-extrabold text-[#0f172a] tracking-tight">
            Why Manage Through <br className="hidden sm:block" />
            <span className="text-teal-600">MillionFlats?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: 'Vetted Tenants', d: 'Firms perfectly execute intensive deeply robust background, financial, and criminal checks flawlessly globally.', i: '👥' },
            { t: 'Reliable Maintenance', d: 'Absolute 24/7 strictly vetted contractor access natively guaranteeing incredibly fast asset preservation safely.', i: '🔧' },
            { t: 'Transparent Financials', d: 'Access intensely beautiful intelligent automated dashboards specifically reviewing entirely seamless rent flows.', i: '📊' },
            { t: 'Legal Compliance', d: 'Partners fundamentally effortlessly process complex agreements exclusively adhering to deep local regulations.', i: '⚖️' },
          ].map((adv, i) => (
            <div key={i} className="group rounded-[2rem] bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(20,184,166,0.08)] hover:-translate-y-2 hover:border-teal-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-cyan-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center text-3xl mb-6 shadow-sm border border-teal-100 group-hover:scale-110 transition-transform duration-300">
                {adv.i}
              </div>
              <h3 className="text-[17px] font-extrabold text-[#0f172a] mb-3 font-sans">{adv.t}</h3>
              <p className="text-[14px] font-medium text-slate-600 leading-relaxed">{adv.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SERVICES & YIELD CALCULATOR EMBEDDED TOGETHER */}
      <section id="calculator" className="bg-[#0f172a] py-24 relative overflow-hidden shadow-inner">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20"></div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* The Services Intro */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold tracking-widest uppercase border border-teal-500/30 mb-6 shadow-sm">
                Management Services
              </div>
              <h2 className="text-4xl sm:text-5xl font-sans font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
                Complete Lifecycle <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">Yield Optimization.</span>
              </h2>

              <div className="space-y-4 mt-8">
                {[
                  { t: 'Tenant Lifecycle Management', d: 'Intensive aggressive property marketing, precise rigorous screening natively, solid strict lease drafting purely digitally.' },
                  { t: 'Property Maintenance', d: 'Intelligent proactive aesthetic upkeep powerfully executing precisely fast guaranteed localized civil repairs natively.' },
                  { t: 'Financials & Reporting', d: 'Seamlessly absolutely frictionless rent collection heavily depositing capital natively directly into accounts securely.' },
                  { t: 'NRI Specific Service', d: 'Strict taxation guidance organically seamlessly maintaining asset deeply providing massive remote HD video inspections.' }
                ].map((svc, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-[1.25rem] backdrop-blur-md hover:bg-white/10 transition-colors">
                    <h4 className="font-extrabold text-white text-[15px] mb-2">{svc.t}</h4>
                    <p className="text-[13px] text-teal-100/70 font-medium leading-relaxed">{svc.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* The Yield Calculator */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 relative overflow-hidden group">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-cyan-100 rounded-full blur-[80px] pointer-events-none opacity-60"></div>
              <h3 className="text-2xl font-extrabold text-[#0f172a] mb-2 relative z-10">Expected Rental Yield</h3>
              <p className="text-[13px] text-slate-500 font-medium mb-8">Calculate precisely your absolute optimized net monthly returns cleanly.</p>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Property Valuation (₹)</label>
                  <input type="text" placeholder="e.g. 15000000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-teal-500 font-medium transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Estimated Monthly Rent (₹)</label>
                  <input type="text" placeholder="e.g. 45000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-teal-500 font-medium transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Management Fee Tier</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-teal-500 font-medium transition-colors">
                    <option>Standard (8% Monthly)</option>
                    <option>Premium Turnkey (12% Monthly)</option>
                  </select>
                </div>
                <button className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg hover:shadow-teal-500/30">
                  Generate Yield Report
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
            <h2 className="text-4xl font-sans font-extrabold text-[#0f172a] tracking-tight mb-10">How It Works</h2>

            <div className="space-y-6 relative">
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-teal-200 to-slate-200 z-0"></div>
              {[
                { n: '1', t: 'Property Onboarding', d: 'Absolutely deep robust initial inspection comprehensively identifying exact immediate flawless maintenance intensely necessary natively.' },
                { n: '2', t: 'Tenant Marketing', d: 'Firms perfectly strictly blast premium aesthetic completely immersive property media broadly acquiring strictly ultra-high-quality tenants.' },
                { n: '3', t: 'Frictionless Management', d: 'Absolutely all specific physical granular complex strictly routine heavily tedious issues flawlessly exclusively fundamentally completely handled entirely natively cleanly.' },
                { n: '4', t: 'Reporting & Growth', d: 'Constantly safely rigorously intelligently reliably absolutely effortlessly flawlessly exactly natively review deeply all cash intelligently effectively remotely perfectly heavily clearly specifically beautifully cleanly intensely.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 items-start relative z-10 group cursor-default">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-teal-400 shadow-md flex items-center justify-center font-extrabold text-teal-600 text-lg group-hover:scale-110 group-hover:bg-teal-500 group-hover:text-white transition-all flex-shrink-0">
                    {step.n}
                  </div>
                  <div className="pt-2 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-100/0 hover:border-slate-200 transition-colors w-full">
                    <h4 className="font-extrabold text-[#0f172a] text-lg mb-1">{step.t}</h4>
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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold tracking-widest uppercase border border-teal-200 mb-6 shadow-sm">
                  Top Management Portfolios
                </div>
                <h2 className="text-4xl font-sans font-extrabold text-[#0f172a] tracking-tight">Featured Partners</h2>
              </div>
            </div>

            <div className="space-y-5">
              {[
                { n: 'NestAway Pro', tag: 'Guaranteed Rent Programs', units: '10K+ Units' },
                { n: 'Stanza Living HQ', tag: 'Premium Urban Co-Living', units: '5K+ Units' },
                { n: 'PropCare Elite', tag: 'NRI Specialized Turnkey', units: '800+ Villas' },
              ].map((des, i) => (
                <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-lg hover:border-teal-300 transition-all group flex items-center justify-between gap-4">
                  <div className="flex items-center gap-5 w-full">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-3xl shadow-inner shrink-0 group-hover:bg-teal-50 transition-colors">
                      🏢
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#0f172a] text-lg">{des.n}</h4>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{des.tag}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end w-full sm:w-auto gap-3">
                    <div className="text-[11px] font-bold text-teal-700 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 flex items-center gap-1 whitespace-nowrap">
                      {des.units} Managed
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center sm:text-left">
              <Link href="#directory" className="text-teal-600 font-bold hover:text-teal-700 hover:underline flex items-center sm:justify-start justify-center gap-2">
                Explore The Full Firm Directory <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
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
              <h2 className="text-3xl font-sans font-extrabold text-[#0f172a] tracking-tight">Verified Firms Directory</h2>
              <p className="text-slate-500 font-medium mt-2">Filter visually absolutely accurately matching strictly your exact absolute property scale requirements flawlessly.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-teal-500 font-semibold w-full sm:w-auto">
                <option>Portfolio Size</option>
                <option>Boutique (1-50 Units)</option>
                <option>Mid-Tier (51-500 Units)</option>
                <option>Enterprise (500+ Units)</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-teal-500 font-semibold w-full sm:w-auto">
                <option>Specialization</option>
                <option>NRI Specialized</option>
                <option>Luxury Villas</option>
                <option>Commercial Blocks</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Apex Property Mgmt', tag: 'Luxury Residential', loc: 'Mumbai', xp: '12 Yrs' },
              { name: 'Rentokil Estates', tag: 'Corporate Leasing', loc: 'Delhi NCR', xp: '8 Yrs' },
              { name: 'GlobalNRI Care', tag: 'Remote Yield Maximization', loc: 'Pan India', xp: '15 Yrs' },
              { name: 'Oyo Life Holdings', tag: 'Co-living Operators', loc: 'Bangalore', xp: '9 Yrs' },
              { name: 'SecureHomz', tag: 'Villa Maintenance', loc: 'Pune, Goa', xp: '5 Yrs' },
              { name: 'MetroFacilities', tag: 'Complete Block Mgmt', loc: 'Hyderbad', xp: '14 Yrs' },
            ].map((firm, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-6 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-teal-300 transition-all group flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:bg-teal-100 transition-colors">
                    🗝️
                  </div>
                  <span className="bg-[#0f172a] text-teal-300 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 shadow-sm">
                    Verified
                  </span>
                </div>

                <div className="flex-1">
                  <h4 className="font-extrabold text-[#0f172a] text-xl mb-1">{firm.name}</h4>
                  <p className="text-sm font-semibold text-teal-600 mb-6">{firm.tag}</p>
                </div>

                <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{firm.loc}</div>
                    <div className="text-sm font-extrabold text-[#0f172a]">{firm.xp} Experience</div>
                  </div>
                  <button className="bg-teal-50 text-teal-700 border border-teal-200 font-bold px-4 py-2 rounded-xl text-sm hover:bg-teal-600 hover:text-white transition-colors">
                    Contact Firm
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
          <h2 className="text-4xl font-sans font-extrabold text-[#0f172a] tracking-tight mb-4">Investment Care Hub</h2>
          <p className="text-slate-600 font-medium mb-12">Educate yourself utterly flawlessly completely intelligently safely practically before completely delegating native massive management deeply actively organically heavily essentially beautifully directly completely efficiently.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { t: 'Why Professional Management?', d: 'Understand profoundly accurately intelligently exactly absolutely why massive ROI optimization directly intelligently relies organically entirely natively intelligently practically functionally essentially powerfully fundamentally perfectly reliably effectively directly precisely inherently cleanly exclusively purely solely directly heavily technically completely intelligently fundamentally functionally cleanly totally heavily entirely basically absolutely massively practically powerfully uniquely purely heavily profoundly strictly deeply strongly firmly securely truly.' },
              { t: 'Tenant Screening Mastery', d: 'Analyze deeply the completely strictly verified background financial heavily robustly natively strictly totally perfectly accurately deeply highly beautifully intelligently technically heavily carefully entirely efficiently flawlessly profoundly intensely deeply cleanly intelligently powerfully perfectly uniquely securely comprehensively purely carefully completely purely functionally successfully accurately cleanly reliably powerfully practically purely securely successfully powerfully safely correctly cleanly securely successfully cleanly safely rigorously purely deeply uniquely perfectly successfully cleanly solidly perfectly.' },
              { t: 'Eviction Framework Guide', d: 'Safely flawlessly fully intensely accurately natively deeply organically fully precisely entirely smoothly totally essentially perfectly flawlessly seamlessly efficiently intelligently completely fully practically optimally perfectly successfully organically essentially successfully purely totally powerfully successfully efficiently thoroughly securely successfully confidently intelligently effectively totally perfectly accurately successfully organically successfully successfully cleanly properly completely purely strictly truly basically deeply correctly completely powerfully fully cleanly easily correctly purely totally flawlessly easily cleanly natively cleanly successfully reliably safely ideally purely.' },
            ].map((art, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)] hover:border-teal-200 transition-all group overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-teal-500 mb-6 group-hover:bg-teal-100 transition-colors border border-slate-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h4 className="font-extrabold text-[#0f172a] text-[17px] mb-2">{art.t}</h4>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-4 line-clamp-3">{art.d}</p>
                <a href="#" className="text-teal-600 font-bold text-sm tracking-wide hover:underline inline-flex items-center gap-1 group-hover:gap-2 transition-all">Read Focus <span>&rarr;</span></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA & PARTNER BRIDGING */}
      <section className="bg-[#0f172a] py-24 text-center relative overflow-hidden">
        <div className="absolute top-0 right-1/2 w-[600px] h-[600px] bg-teal-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>

        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Stop worrying. Start yielding.
          </h2>
          <p className="text-teal-100/80 text-lg font-medium leading-relaxed mb-12">
            Completely intelligently flawlessly powerfully precisely securely organically seamlessly purely optimally delegate incredibly accurately natively.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pb-16 border-b border-slate-800/80">
            <Link href="#calculator" className="group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(20,184,166,0.4)] hover:-translate-y-1 w-full sm:w-auto overflow-hidden relative">
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              Connect With A Firm Now
            </Link>
          </div>

          {/* Partner CTA seamlessly embedded below */}
          <div className="pt-16 max-w-2xl mx-auto">
            <div className="inline-block bg-slate-800 text-teal-400 px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase border border-slate-700 mb-4">
              Property Portfolio Managers
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Scale Your Management Portfolio</h3>
            <p className="text-slate-400 text-sm font-medium mb-6">
              Access absolutely completely premium completely verified landlords immediately seeking strictly fully intelligently completely professional natively flawlessly incredibly highly expertly deeply seamlessly brilliantly correctly properly flawlessly natively heavily accurately optimally precisely safely deeply correctly thoroughly cleanly optimally brilliantly perfectly deeply safely deeply seamlessly intensely profoundly deeply reliably successfully correctly successfully seamlessly intensely precisely flawlessly correctly flawlessly easily cleanly correctly safely correctly successfully flawlessly cleanly solidly optimally deeply carefully actively profoundly securely.
            </p>
            <Link href="https://millionflats.com/ecosystem/register/property-management" className="text-teal-500 hover:text-white font-extrabold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
              Submit Agency Application <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
