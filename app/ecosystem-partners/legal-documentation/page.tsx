import Link from 'next/link'

export const metadata = {
  title: 'Legal & Documentation - MillionFlats Ecosystem',
  description: 'Connect with verified legal partners for due diligence, agreement drafting, registration, and peace of mind.',
}

export default function LegalDocumentationPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-200 selection:text-indigo-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-200/40 to-blue-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-violet-100/40 to-fuchsia-100/30 blur-[120px] mix-blend-multiply" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-0 pb-24 z-10 text-center flex flex-col items-center">
        
        {/* HORIZONTAL AD BANNER SPACE */}
        <div className="w-full h-[120px] sm:h-[180px] lg:h-[220px] xl:h-[300px] mb-14 rounded-3xl bg-slate-200/50 backdrop-blur-md overflow-hidden shadow-inner border border-slate-300 relative flex items-center justify-center group">
           <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse opacity-50 z-0"></div>
           <p className="relative z-20 text-slate-500 font-extrabold tracking-widest uppercase text-sm group-hover:scale-105 transition-transform drop-shadow-sm">Ad Banner Space</p>
        </div>

        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-indigo-700 shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
          </span>
          Strictly Verified Legal Experts
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-extrabold text-dark-blue tracking-tight leading-[1.05] max-w-4xl mx-auto ">
          Secure Your Property Transaction <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-violet-500">
            with Expert Support
          </span>
        </h1>
        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto ">
          Connect with verified legal partners for due diligence, agreement drafting, registration, and absolute peace of mind—only on MillionFlats.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center justify-center gap-5 w-full sm:w-auto">
          <Link href="#directory" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-dark-blue to-indigo-950 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(55,48,163,0.3)] hover:shadow-[0_15px_50px_rgba(55,48,163,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center gap-3">
              Get a Legal Consultation
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
            Why Choose Legal Partners <br className="hidden sm:block" />
            <span className="text-indigo-600">Through MillionFlats?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: 'Vetted Expertise', d: 'Every firm is stringently verified for real estate specialization and professional standing.', i: '⚖️' },
            { t: 'Fixed-Fee Transparency', d: 'Clear pricing for common services with no hidden costs or last-minute surprises.', i: '📋' },
            { t: 'Document Security & Tech', d: 'Partners use strictly secure platforms for document handling and legal e-signing.', i: '🔒' },
            { t: 'Seamless Coordination', d: 'Your legal partner coordinates directly with your agent for a flawlessly smooth process.', i: '🤝' },
          ].map((adv, i) => (
            <div key={i} className="group rounded-[2rem] bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.08)] hover:-translate-y-2 hover:border-indigo-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-violet-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mb-6 shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform duration-300">
                {adv.i}
              </div>
              <h3 className="text-[17px] font-extrabold text-dark-blue mb-3 font-sans">{adv.t}</h3>
              <p className="text-[14px] font-medium text-slate-600 leading-relaxed">{adv.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SERVICES OVERVIEW */}
      <section className="bg-dark-blue py-24 relative overflow-hidden shadow-inner">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20"></div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold tracking-widest uppercase border border-indigo-500/30 mb-6 shadow-sm">
            Legal Coverage
          </div>
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
            Comprehensive Legal Services <br />for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Every Step.</span>
          </h2>
          <p className="text-slate-400 text-lg font-medium leading-relaxed mb-16 max-w-2xl mx-auto">
            From preliminary title verifications to complex cross-border compliance, our verified experts cover every aspect of your real estate transaction natively.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            {[
              { t: 'For Buyers', d: 'Title verification, agreement review, stringent due diligence, and full registration processing.', ic: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
              { t: 'For Sellers', d: 'Flawless drafting of sale agreements, NOC clearances, and managing complex documentation natively.', ic: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              { t: 'For NRIs/Investors', d: 'Power of Attorney (PoA) drafting, cross-border compliance, specific state regulatory filings.', ic: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
              { t: 'General & Dispute', d: 'Expert legal opinion, localized dispute resolution support, and real estate litigation.', ic: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3' },
            ].map((svc, i) => (
              <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-md hover:bg-white/10 hover:border-indigo-500/30 hover:-translate-y-1 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center mb-6 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={svc.ic} /></svg>
                </div>
                <h3 className="text-[17px] font-extrabold text-white mb-3">{svc.t}</h3>
                <p className="text-[14px] text-indigo-200/70 font-medium leading-relaxed">{svc.d}</p>
              </div>
            ))}
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
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-indigo-200 to-slate-200 z-0"></div>
              {[
                { n: '1', t: 'Describe Your Need', d: 'Select your service priority (e.g., "Agreement Review for Purchase") natively.' },
                { n: '2', t: 'Get Matched', d: 'We instantly connect you with a strictly verified legal expert in your specific jurisdiction.' },
                { n: '3', t: 'Consult & Engage', d: 'Discuss exact scope, timeline, and secure a transparent fixed fee.' },
                { n: '4', t: 'Execute Securely', d: 'Your critical documents are processed flawlessly with absolute transparency.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 items-start relative z-10 group cursor-default">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-indigo-400 shadow-md flex items-center justify-center font-extrabold text-indigo-600 text-lg group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all flex-shrink-0">
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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold tracking-widest uppercase border border-indigo-200 mb-6 shadow-sm">
                  Top Advisors
                </div>
                <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight">Featured Partners</h2>
              </div>
            </div>

            <div className="space-y-5">
              {[
                { n: 'Lex Property Counsel', tag: 'Expertise in NRI Property Law', xp: '15+ Years' },
                { n: 'Singhania & Partners', tag: 'Pan-India Registration Network', xp: '20+ Years' },
                { n: 'Metro Legal Advisors', tag: 'Commercial Due Diligence', xp: '10+ Years' },
              ].map((firm, i) => (
                <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all group flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:bg-indigo-50 transition-colors">
                      🏛️
                    </div>
                    <div>
                      <h4 className="font-extrabold text-dark-blue text-lg flex items-center gap-2">
                        {firm.n}
                        <span className="bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ml-1">Verified</span>
                      </h4>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{firm.tag}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end w-full sm:w-auto gap-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{firm.xp} Experience</div>
                    <button className="bg-slate-100 hover:bg-dark-blue hover:text-white text-dark-blue text-sm font-bold px-5 py-2 rounded-lg transition-colors whitespace-nowrap w-full sm:w-auto">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center sm:text-left">
              <Link href="#directory" className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline flex items-center sm:justify-start justify-center gap-2">
                Explore Full Partner Directory <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
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
              <h2 className="text-3xl font-sans font-extrabold text-dark-blue tracking-tight">Legal Experts Directory</h2>
              <p className="text-slate-500 font-medium mt-2">Filter to find the exact legal expertise your transaction absolutely requires.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-semibold w-full sm:w-auto">
                <option>Firm Type</option>
                <option>Law Firm</option>
                <option>Individual Advocate</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-semibold w-full sm:w-auto">
                <option>Jurisdiction</option>
                <option>Mumbai</option>
                <option>Delhi NCR</option>
                <option>Dubai (UAE)</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500 font-semibold w-full sm:w-auto">
                <option>Specialization</option>
                <option>NRI Protocols</option>
                <option>Commercial</option>
                <option>Litigation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:border-indigo-200 transition-all group flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:bg-indigo-50 transition-colors">
                      ✍️
                    </div>
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded border border-emerald-100 flex items-center gap-1">
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Verified
                    </span>
                  </div>
                  <h4 className="font-extrabold text-dark-blue text-lg mb-1">Adhya Legal {i + 1}</h4>
                  <p className="text-sm font-semibold text-indigo-600 mb-4">Complete Title Due Diligence</p>
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-auto">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Jurisdiction</div>
                    <div className="text-sm font-extrabold text-dark-blue">Mumbai Central</div>
                  </div>
                  <button className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold px-4 py-2 rounded-lg text-sm hover:bg-indigo-600 hover:text-white transition-colors">
                    Request Quote
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
          <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight mb-4">Knowledge Centre: Legal Essentials</h2>
          <p className="text-slate-600 font-medium mb-12">Empower yourself heavily before signing any agreement.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { t: 'Key Clauses in a Sale Agreement', d: 'What you must strictly look out for before executing your critical purchase agreement.' },
              { t: 'Due Diligence Checklist for Buyers', d: 'A comprehensive legal checkpoint list for verifying any property intelligently.' },
              { t: 'Understanding Stamp Duty', d: 'How complex stamp duty and state registration natively affects your capital.' },
            ].map((art, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600 mb-6 group-hover:bg-indigo-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h4 className="font-extrabold text-dark-blue text-lg mb-2">{art.t}</h4>
                <p className="text-[14px] text-slate-500 font-medium leading-relaxed mb-4">{art.d}</p>
                <a href="#" className="text-indigo-600 font-bold text-sm tracking-wide hover:underline inline-flex items-center gap-1 group-hover:gap-2 transition-all">Read More <span>&rarr;</span></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA & PARTNER BRIDGING */}
      <section className="bg-indigo-950 py-24 text-center relative overflow-hidden">
        <div className="absolute top-0 right-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>

        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Don&apos;t let legal complexities risk your investment.
          </h2>
          <p className="text-indigo-100/80 text-lg font-medium leading-relaxed mb-12">
            Engage with MillionFlats verified legal specialists and aggressively secure your asset flawlessly.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pb-16 border-b border-indigo-800/50">
            <Link href="#directory" className="group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-400 text-white font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(79,70,229,0.4)] hover:-translate-y-1 w-full sm:w-auto overflow-hidden relative">
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              Connect with a Legal Expert Today
            </Link>
            <button className="flex items-center justify-center h-16 px-12 rounded-2xl border-2 border-indigo-800 bg-transparent text-white font-extrabold text-lg hover:border-indigo-600 hover:bg-indigo-900/50 transition-all shadow-sm w-full sm:w-auto">
              Download Due Diligence Checklist
            </button>
          </div>

          {/* Partner CTA seamlessly embedded below */}
          <div className="pt-16 max-w-2xl mx-auto">
            <div className="inline-block bg-indigo-900 text-indigo-300 px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase border border-indigo-800 mb-4">
              Expand Your Legal Practice
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Partner with MillionFlats</h3>
            <p className="text-indigo-200/70 text-sm font-medium mb-6">
              Join our exclusive network of legal experts and connect with a steady stream of clients engaged in active property transactions.
            </p>
            <Link href="https://millionflats.com/ecosystem/register/legal-documentation" className="text-indigo-400 hover:text-white font-extrabold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
              Submit Firm Application <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
