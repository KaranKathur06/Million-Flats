import Link from 'next/link'

export const metadata = {
  title: 'Property Insurance - MillionFlats Ecosystem',
  description: 'Find the right insurance for your home, rental, or investment through our curated network of trusted providers.',
}

export default function PropertyInsurancePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-sky-200 selection:text-sky-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-sky-200/40 to-blue-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-100/40 to-teal-100/30 blur-[120px] mix-blend-multiply" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-0 pb-24 z-10 text-center flex flex-col items-center">
        
        {/* HORIZONTAL AD BANNER SPACE */}
        <div className="w-full h-[120px] sm:h-[180px] lg:h-[220px] xl:h-[300px] mb-14 rounded-3xl bg-slate-200/50 backdrop-blur-md overflow-hidden shadow-inner border border-slate-300 relative flex items-center justify-center group">
           <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse opacity-50 z-0"></div>
           <p className="relative z-20 text-slate-500 font-extrabold tracking-widest uppercase text-sm group-hover:scale-105 transition-transform drop-shadow-sm">Ad Banner Space</p>
        </div>

        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-sky-700 shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
          </span>
          Curated Insurance Network
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-extrabold text-dark-blue tracking-tight leading-[1.05] max-w-4xl mx-auto ">
          Secure Your Property. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-500">
            Insure with Confidence.
          </span>
        </h1>
        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto ">
          Find the right insurance for your home, rental, or investment through our curated network of trusted providers. Get tailored quotes and seamless support natively.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center justify-center gap-5 w-full sm:w-auto">
          <Link href="#calculator" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-dark-blue to-sky-950 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(14,165,233,0.3)] hover:shadow-[0_15px_50px_rgba(14,165,233,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center gap-3">
              Get a Free Quote
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </Link>
        </div>

        </div>

      </section>

      {/* 2. THE MILLIONFLATS ADVANTAGE */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-20 border-t border-slate-200/50">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-widest uppercase border border-slate-200 mb-6 shadow-sm">
            Ecosystem Advantage
          </div>
          <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight">
            Why Buy Insurance <br className="hidden sm:block" />
            <span className="text-sky-600">Through MillionFlats?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: 'Vetted Expertise', d: 'We rigorously partner only with reputable insurers and brokers consistently known for fair policies and highly reliable claim settlement.', i: '🛡️' },
            { t: 'Transparent Comparison', d: 'View absolutely clear policy summaries, precise coverage details, and net premiums to instantly compare apples-to-apples.', i: '🔍' },
            { t: 'Digital-First Convenience', d: 'Get instant algorithmic quotes, buy entirely online, and intuitively manage your policy vertically through partner tech platforms.', i: '📱' },
            { t: 'Dedicated Support', d: 'Our exclusive partners inherently provide dedicated VIP support precisely for MillionFlats customers during purchase and complex claims.', i: '🤝' },
          ].map((adv, i) => (
            <div key={i} className="group rounded-[2rem] bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(14,165,233,0.08)] hover:-translate-y-2 hover:border-sky-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-blue-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center text-3xl mb-6 shadow-sm border border-sky-100 group-hover:scale-110 transition-transform duration-300">
                {adv.i}
              </div>
              <h3 className="text-[17px] font-extrabold text-dark-blue mb-3 font-sans">{adv.t}</h3>
              <p className="text-[14px] font-medium text-slate-600 leading-relaxed">{adv.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SERVICES & CALCULATOR EMBEDDED TOGETHER */}
      <section id="calculator" className="bg-dark-blue py-24 relative overflow-hidden shadow-inner">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20"></div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* The Services Intro */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold tracking-widest uppercase border border-sky-500/30 mb-6 shadow-sm">
                Coverage Types
              </div>
              <h2 className="text-4xl sm:text-5xl font-sans font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
                Insurance Solutions for <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400">Every Need.</span>
              </h2>

              <div className="space-y-4 mt-8">
                {[
                  { t: 'For Homeowners', d: 'Comprehensive home insurance (structure & contents), fire, burglary, natural disaster coverage.' },
                  { t: 'For Landlords/Investors', d: 'Strict rental property insurance, aggressive loss of rent coverage, full landlord liability.' },
                  { t: 'For Tenants/Renters', d: 'Tenant\'s exact contents insurance, absolute personal liability cover across leases.' },
                  { t: 'General & Specific', d: 'Builder\'s risk insurance, valuable items floater, and advanced cyber protection for sophisticated smart homes.' }
                ].map((svc, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-[1.25rem] backdrop-blur-md hover:bg-white/10 transition-colors">
                    <h4 className="font-extrabold text-white text-[15px] mb-2">{svc.t}</h4>
                    <p className="text-[13px] text-sky-200/80 font-medium leading-relaxed">{svc.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* The Calculator */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 relative overflow-hidden group">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-100 rounded-full blur-[80px] pointer-events-none opacity-60"></div>
              <h3 className="text-2xl font-extrabold text-dark-blue mb-2 relative z-10">Insurance Premium Calculator</h3>
              <p className="text-[13px] text-slate-500 font-medium mb-8">Calculate approximate premiums before committing securely.</p>

              <div className="space-y-6 relative z-10">
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Property Type</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-sky-500 font-medium transition-colors">
                    <option>Apartment / Flat</option>
                    <option>Independent Villa</option>
                    <option>Commercial Property</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Estimated Property Value (Structure + Assets)</label>
                  <input type="text" placeholder="e.g. ₹1,50,00,000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-sky-500 font-medium transition-colors" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Location / Pincode</label>
                  <input type="text" placeholder="e.g. 400001 (Mumbai South)" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-sky-500 font-medium transition-colors" />
                </div>
                <button className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold py-4 rounded-xl transition-all mt-4 shadow-lg hover:shadow-sky-500/30">
                  Generate Instant Quote
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
            <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight mb-10">How It Works</h2>

            <div className="space-y-6 relative">
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-sky-200 to-slate-200 z-0"></div>
              {[
                { n: '1', t: 'Assess Your Needs', d: 'Instantly use our internal guide or calculator to scientifically determine the absolute coverage you fundamentally need.' },
                { n: '2', t: 'Compare Quotes', d: 'Natively receive and intensely compare tailored programmatic quotes directly from stringently verified partners.' },
                { n: '3', t: 'Select & Purchase', d: 'Choose the flawless plan and effortlessly complete the absolutely secure digital purchase transparently.' },
                { n: '4', t: 'Stay Protected', d: 'Reliably get your secure policy documents and fundamentally access native VIP support strictly for any future unavoidable claims.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 items-start relative z-10 group cursor-default">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-sky-400 shadow-md flex items-center justify-center font-extrabold text-sky-600 text-lg group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all flex-shrink-0">
                    {step.n}
                  </div>
                  <div className="pt-2 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-100/0 hover:border-slate-200 transition-colors w-full">
                    <h4 className="font-extrabold text-dark-blue text-lg mb-1">{step.t}</h4>
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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 text-sky-700 text-xs font-bold tracking-widest uppercase border border-sky-200 mb-6 shadow-sm">
                  Top Insurers
                </div>
                <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight">Featured Partners</h2>
              </div>
            </div>

            <div className="space-y-5">
              {[
                { n: 'HDFC ERGO General', tag: 'Highest Claim Settlement Ratio', st: '98.5%' },
                { n: 'ICICI Lombard', tag: 'Instant Digital Policy Issuance', st: '<2 Mins' },
                { n: 'Digit Insurance', tag: 'Zero Pre-Inspection Needed', st: 'Fast Track' },
              ].map((ins, i) => (
                <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:border-sky-300 transition-all group flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:bg-sky-50 transition-colors">
                      ☂️
                    </div>
                    <div>
                      <h4 className="font-extrabold text-dark-blue text-lg">{ins.n}</h4>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{ins.tag}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end w-full sm:w-auto gap-3">
                    <div className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded inline-block uppercase tracking-widest border border-slate-200 whitespace-nowrap">{ins.st} Rating</div>
                    <button className="bg-slate-100 hover:bg-dark-blue hover:text-white text-dark-blue text-sm font-bold px-5 py-2 rounded-lg transition-colors whitespace-nowrap w-full sm:w-auto">
                      View Plan Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center sm:text-left">
              <Link href="#directory" className="text-sky-600 font-bold hover:text-sky-700 hover:underline flex items-center sm:justify-start justify-center gap-2">
                View Full Premium Insurer Directory <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
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
              <h2 className="text-3xl font-sans font-extrabold text-dark-blue tracking-tight">Insurance Directory</h2>
              <p className="text-slate-500 font-medium mt-2">Filter and find strictly verified partners guaranteeing absolute coverage.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 font-semibold w-full sm:w-auto">
                <option>Provider Type</option>
                <option>Direct Insurer</option>
                <option>Insurance Broker</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 font-semibold w-full sm:w-auto">
                <option>Insurance Types</option>
                <option>Home/Structure</option>
                <option>Contents/Valuables</option>
                <option>Landlord Liability</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-sky-500 font-semibold w-full sm:w-auto">
                <option>Settlement Ratio</option>
                <option>&gt; 95% High</option>
                <option>&gt; 98% Ultra</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'National Insurance', tag: 'Structure & Asset', rat: '96.2%' },
              { name: 'Bajaj Allianz', tag: 'Fast Digital Claims', rat: '97.5%' },
              { name: 'TATA AIG', tag: 'Luxury Valuables Cover', rat: '98.1%' },
              { name: 'PolicyBazaar Brokers', tag: 'Aggregated Quotations', rat: 'Broker' },
              { name: 'Reliance General', tag: 'Comprehensive Disaster', rat: '95.8%' },
              { name: 'SBI General', tag: 'Pan India Asset Coverage', rat: '96.9%' },
            ].map((firm, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:border-sky-200 transition-all group flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:bg-sky-50 transition-colors">
                      🏢
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded border border-emerald-100 flex items-center gap-1 shadow-sm">
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Verified
                    </span>
                  </div>
                  <h4 className="font-extrabold text-dark-blue text-lg mb-1">{firm.name}</h4>
                  <p className="text-sm font-semibold text-sky-600 mb-4">{firm.tag}</p>
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-auto">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Settlement Ratio</div>
                    <div className="text-lg font-extrabold text-dark-blue">{firm.rat}</div>
                  </div>
                  <button className="bg-sky-50 text-sky-700 border border-sky-200 font-bold px-4 py-2 rounded-lg text-sm hover:bg-sky-600 hover:text-white transition-colors">
                    Get Custom Quote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. EDUCATIONAL RESOURCES */}
      <section className="bg-slate-50 py-24 border-b border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight mb-4">Understanding Property Insurance</h2>
          <p className="text-slate-600 font-medium mb-12">Educate yourself flawlessly before binding an insurance contract on your asset.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { t: 'Sum Insured vs. Market Value', d: 'What\'s the critical difference? How to absolutely guarantee your home replacement costs intelligently.' },
              { t: 'What is Typically Covered', d: 'Understand exact boundaries: fire, act of God, and what is specifically inherently excluded in fine prints.' },
              { t: 'Step-by-Step Claim Filing', d: 'A precise, frictionless guide to properly filing a claim seamlessly and quickly retrieving your capital payout.' },
            ].map((art, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-sky-600 mb-6 group-hover:bg-sky-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h4 className="font-extrabold text-dark-blue text-lg mb-2">{art.t}</h4>
                <p className="text-[14px] text-slate-500 font-medium leading-relaxed mb-4">{art.d}</p>
                <a href="#" className="text-sky-600 font-bold text-sm tracking-wide hover:underline inline-flex items-center gap-1 group-hover:gap-2 transition-all">Read More <span>&rarr;</span></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA & PARTNER BRIDGING */}
      <section className="bg-dark-blue py-24 text-center relative overflow-hidden">
        <div className="absolute top-0 right-1/2 w-[600px] h-[600px] bg-sky-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>

        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Don't wait for misfortune to strike.
          </h2>
          <p className="text-sky-100/80 text-lg font-medium leading-relaxed mb-12">
            Protect your most valuable asset today completely transparently natively on MillionFlats with zero waste policies.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pb-16 border-b border-sky-800/50">
            <Link href="#calculator" className="group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(14,165,233,0.4)] hover:-translate-y-1 w-full sm:w-auto overflow-hidden relative">
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              Start My Quote Now
            </Link>
            <button className="flex items-center justify-center h-16 px-12 rounded-2xl border-2 border-sky-800 bg-transparent text-white font-extrabold text-lg hover:border-sky-600 hover:bg-sky-900/50 transition-all shadow-sm w-full sm:w-auto">
              Download Insurance Checklist
            </button>
          </div>

          {/* Partner CTA seamlessly embedded below */}
          <div className="pt-16 max-w-2xl mx-auto">
            <div className="inline-block bg-sky-900 text-sky-300 px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase border border-sky-800 mb-4">
              Insurance Providers B2B
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Partner with MillionFlats</h3>
            <p className="text-sky-200/70 text-sm font-medium mb-6">
              Connect your insurance products directly with motivated customers precisely at the absolute point of purchase and ownership.
            </p>
            <Link href="https://millionflats.com/ecosystem/register/property-insurance" className="text-sky-400 hover:text-white font-extrabold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
              Submit Firm Application <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
