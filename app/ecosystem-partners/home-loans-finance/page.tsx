import Link from 'next/link'

export const metadata = {
  title: 'Home Loans & Finance - MillionFlats Ecosystem',
  description: 'Finance Your Dream Home with Confidence. Get matched with trusted lenders offering competitive rates, exclusive deals, and fast approvals.',
}

export default function HomeLoansFinancePage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-200 selection:text-emerald-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-emerald-200/40 to-teal-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-100/40 to-blue-100/30 blur-[120px] mix-blend-multiply" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-0 pb-24 z-10 text-center flex flex-col items-center">
        
        {/* HORIZONTAL AD BANNER SPACE */}
        <div className="w-full h-[120px] sm:h-[180px] lg:h-[220px] xl:h-[300px] mb-14 bg-slate-200/50 backdrop-blur-md overflow-hidden shadow-inner border border-slate-300 relative flex items-center justify-center group">
           <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse opacity-50 z-0"></div>
           <p className="relative z-20 text-slate-500 font-extrabold tracking-widest uppercase text-sm group-hover:scale-105 transition-transform drop-shadow-sm">Ad Banner Space</p>
        </div>

        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-emerald-700 shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          Verified Finance Ecosystem
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-extrabold text-dark-blue tracking-tight leading-[1.05] max-w-4xl mx-auto ">
          Finance Your Dream Home <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-teal-500">
            with Confidence
          </span>
        </h1>
        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto ">
          Get matched with trusted lenders offering competitive rates, exclusive deals, and fast approvals—only through MillionFlats.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center justify-center gap-5 w-full sm:w-auto">
          <Link href="#eligibility" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-dark-blue to-emerald-950 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(6,95,70,0.3)] hover:shadow-[0_15px_50px_rgba(6,95,70,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center gap-3">
              Check Your Eligibility in 60 Seconds
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
            Why Secure Your Loan <br className="hidden sm:block" />
            <span className="text-emerald-600">Through MillionFlats?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: 'MillionFlats Verified', d: 'All partners are rigorously vetted for credibility and customer service.', i: '🛡️' },
            { t: 'Best-In-Market Rates', d: 'We negotiate competitive terms, processing fees, and rates on your behalf.', i: '📉' },
            { t: 'Seamless Process', d: 'From pre-approval to disbursement, we facilitate smoother coordination.', i: '⚡' },
            { t: 'Personalised Matching', d: 'Connect with lenders suited to your exact profile (salaried, self-employed, NRI).', i: '🎯' },
          ].map((adv, i) => (
            <div key={i} className="group rounded-[2rem] bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.08)] hover:-translate-y-2 hover:border-emerald-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl mb-6 shadow-sm border border-emerald-100 group-hover:scale-110 transition-transform duration-300">
                {adv.i}
              </div>
              <h3 className="text-[17px] font-extrabold text-dark-blue mb-3 font-sans">{adv.t}</h3>
              <p className="text-[14px] font-medium text-slate-600 leading-relaxed">{adv.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. INTERACTIVE TOOLS */}
      <section id="eligibility" className="bg-dark-blue py-24 relative overflow-hidden shadow-inner">
        <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20"></div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold tracking-widest uppercase border border-emerald-500/30 mb-6 shadow-sm">
                Interactive Calculators
              </div>
              <h2 className="text-4xl sm:text-5xl font-sans font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
                Calculate your <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">EMI & Eligibility.</span>
              </h2>
              <p className="text-slate-300 text-lg font-medium leading-relaxed mb-10">
                Plan your finances before you apply. Use our interactive EMI Calculator and 60-second Eligibility Checker to discover your borrowing power immediately.
              </p>

              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-md hover:bg-white/10 transition-colors">
                <h3 className="text-xl font-bold text-white mb-4">Quick Eligibility Checker</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-2">Net Monthly Income (₹)</label>
                    <input type="text" placeholder="e.g. 150000" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-2">Existing EMIs (₹)</label>
                    <input type="text" placeholder="e.g. 25000" className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition-colors" />
                  </div>
                  <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-dark-blue font-extrabold py-3.5 rounded-xl transition-colors mt-2 shadow-lg hover:shadow-emerald-500/30">
                    Check Eligibility Instantly
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 relative overflow-hidden group">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-teal-100 rounded-full blur-[80px] pointer-events-none opacity-60"></div>
              <h3 className="text-2xl font-extrabold text-dark-blue mb-8 relative z-10">EMI Calculator</h3>

              <div className="space-y-8 relative z-10">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-slate-600">Loan Amount</label>
                    <span className="text-sm font-extrabold text-emerald-600">₹ 50,00,000</span>
                  </div>
                  <input type="range" min="1000000" max="100000000" defaultValue="5000000" className="w-full accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-slate-600">Interest Rate (% p.a.)</label>
                    <span className="text-sm font-extrabold text-emerald-600">8.5%</span>
                  </div>
                  <input type="range" min="6" max="15" step="0.1" defaultValue="8.5" className="w-full accent-emerald-500" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-slate-600">Tenure (Years)</label>
                    <span className="text-sm font-extrabold text-emerald-600">20 Years</span>
                  </div>
                  <input type="range" min="1" max="30" defaultValue="20" className="w-full accent-emerald-500" />
                </div>
              </div>

              <div className="mt-10 p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6 relative z-10 group-hover:bg-emerald-50 transition-colors">
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Monthly EMI</div>
                  <div className="text-4xl font-extrabold text-dark-blue">₹ 43,391</div>
                </div>
                <div className="text-left w-full sm:w-auto space-y-2">
                  <div className="flex justify-between gap-6 text-sm">
                    <span className="text-slate-500 font-medium">Principal:</span>
                    <span className="font-bold text-slate-800">₹ 50L</span>
                  </div>
                  <div className="flex justify-between gap-6 text-sm">
                    <span className="text-slate-500 font-medium">Interest:</span>
                    <span className="font-bold text-slate-800">₹ 54.1L</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 & 5. FEATURED PARTNERS & HOW IT WORKS */}
      <section className="bg-slate-50 py-24 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">

          {/* How It Works */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold tracking-widest uppercase border border-slate-200 mb-6 shadow-sm">
              Process Flow
            </div>
            <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight mb-10">How It Works</h2>

            <div className="space-y-6 relative">
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-emerald-200 to-slate-200 z-0"></div>
              {[
                { n: '1', t: 'Check Eligibility', d: 'Use our calculators for instant preliminary assessment.' },
                { n: '2', t: 'Compare Offers', d: 'View matched tailored plans from verified lenders securely.' },
                { n: '3', t: 'Connect & Apply', d: 'Choose your ideal lender and submit soft documents digitally.' },
                { n: '4', t: 'Get Sanctioned', d: 'Receive your official loan approval seamlessly via MillionFlats.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 items-start relative z-10 group cursor-default">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-emerald-400 shadow-md flex items-center justify-center font-extrabold text-emerald-600 text-lg group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all flex-shrink-0">
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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold tracking-widest uppercase border border-emerald-200 mb-6 shadow-sm">
                  Top Providers
                </div>
                <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight">Featured Partners</h2>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { n: 'HDFC Home Loans', tag: 'Lowest Interest Rates for NRIs', rt: '8.40%' },
                { n: 'SBI Home Finance', tag: 'Zero Processing Fee offers', rt: '8.50%' },
                { n: 'ICICI Bank', tag: 'Fastest 48-Hour Sanctions', rt: '8.45%' },
              ].map((bk, i) => (
                <div key={i} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all group flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-5 w-full">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:bg-emerald-50 transition-colors">
                      🏦
                    </div>
                    <div>
                      <h4 className="font-extrabold text-dark-blue text-lg flex items-center gap-2">
                        {bk.n}
                        <svg className="w-4 h-4 text-sky-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      </h4>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{bk.tag}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end w-full sm:w-auto gap-3">
                    <div className="text-sm font-medium text-slate-500">Starting from <span className="font-extrabold text-emerald-600 text-lg ml-1">{bk.rt}</span></div>
                    <button className="bg-slate-100 hover:bg-dark-blue hover:text-white text-dark-blue text-sm font-bold px-5 py-2 rounded-lg transition-colors whitespace-nowrap w-full sm:w-auto">
                      View Details & Apply
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center sm:text-left">
              <Link href="#directory" className="text-emerald-600 font-bold hover:text-emerald-700 hover:underline flex items-center sm:justify-start justify-center gap-2">
                View Comprehensive Lender Directory <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. COMPREHENSIVE LENDER DIRECTORY */}
      <section id="directory" className="bg-white py-24 border-y border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-sans font-extrabold text-dark-blue tracking-tight">Comprehensive Directory</h2>
              <p className="text-slate-500 font-medium mt-2">Filter and find the perfect Verified Partner for your property type.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-semibold w-full md:w-auto">
                <option>All Bank / NBFC</option>
                <option>Public Sector</option>
                <option>Private Sector</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 font-semibold w-full md:w-auto">
                <option>Specialization</option>
                <option>NRI Loans</option>
                <option>Balance Transfer</option>
                <option>First-Time Buyers</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Axis Bank', type: 'Private Bank', tag: 'Quick Disbursement', rate: '8.55%' },
              { name: 'Kotak Mahindra', type: 'Private Bank', tag: 'Waiver on Balance Transfer', rate: '8.45%' },
              { name: 'Bajaj Housing', type: 'NBFC', tag: 'High Value Loans', rate: '8.60%' },
              { name: 'Bank of Baroda', type: 'Public Bank', tag: 'Lowest rates for Salaried', rate: '8.40%' },
              { name: 'PNB Housing', type: 'HFC', tag: 'Flexi EMI options', rate: '8.75%' },
              { name: 'L&T Finance', type: 'NBFC', tag: 'Self-Employed Friendly', rate: '8.90%' },
            ].map((ld, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-[0_10px_30px_rgba(0,0,0,0.06)] hover:border-emerald-200 transition-all group flex flex-col justify-between h-full">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:bg-emerald-50 transition-colors">
                      🏦
                    </div>
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded border border-slate-200">{ld.type}</span>
                  </div>
                  <h4 className="font-extrabold text-dark-blue text-lg mb-1">{ld.name}</h4>
                  <p className="text-sm font-semibold text-emerald-600 mb-4">{ld.tag}</p>
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-auto">
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Rates From</div>
                    <div className="text-xl font-extrabold text-dark-blue">{ld.rate}</div>
                  </div>
                  <button className="bg-white text-emerald-600 border border-emerald-200 font-bold px-4 py-2 rounded-lg text-sm hover:bg-emerald-600 hover:text-white transition-colors">
                    Get Quote
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
          <h2 className="text-4xl font-sans font-extrabold text-dark-blue tracking-tight mb-4">Guide to Home Loans</h2>
          <p className="text-slate-600 font-medium mb-12">Educate yourself before making one of life's biggest financial decisions.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { t: 'Fixed vs. Floating Rate', d: 'Understand the pros and cons of locking in your interest rate versus riding market trends.' },
              { t: 'Documents Checklist', d: 'A comprehensive list of KYC, income, and property documents required for sanctions.' },
              { t: 'Understanding Your Credit Score', d: 'How your CIBIL score affects your interest rate and negotiation power with lenders.' },
            ].map((art, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-emerald-600 mb-6 group-hover:bg-emerald-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h4 className="font-extrabold text-dark-blue text-lg mb-2">{art.t}</h4>
                <p className="text-[14px] text-slate-500 font-medium leading-relaxed mb-4">{art.d}</p>
                <a href="#" className="text-emerald-600 font-bold text-sm tracking-wide hover:underline inline-flex items-center gap-1 group-hover:gap-2 transition-all">Read More <span>&rarr;</span></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA & PARTNER BRIDGING */}
      <section className="bg-emerald-950 py-24 text-center relative overflow-hidden">
        <div className="absolute top-0 right-1/2 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>

        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Ready to take the next step?
          </h2>
          <p className="text-emerald-100/80 text-lg font-medium leading-relaxed mb-12">
            Secure the keys to your dream property with India’s most strictly verified finance ecosystem. Let us do the hard negotiations for you.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pb-16 border-b border-emerald-800/50">
            <Link href="#eligibility" className="group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-dark-blue font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)] hover:-translate-y-1 w-full sm:w-auto overflow-hidden relative">
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              Match Me with a Lender
            </Link>
            <button className="flex items-center justify-center h-16 px-12 rounded-2xl border-2 border-emerald-800 bg-transparent text-white font-extrabold text-lg hover:border-emerald-600 hover:bg-emerald-900/50 transition-all shadow-sm w-full sm:w-auto">
              Download Complete Guide
            </button>
          </div>

          {/* Partner CTA seamlessly embedded below */}
          <div className="pt-16 max-w-2xl mx-auto">
            <div className="inline-block bg-emerald-900 text-emerald-300 px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase border border-emerald-800 mb-4">
              B2B Partnerships
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Are you a Bank or NBFC?</h3>
            <p className="text-emerald-200/70 text-sm font-medium mb-6">
              Access high-intent home buyers and grow your loan book. Join our curated ecosystem of trusted finance providers.
            </p>
            <Link href="https://millionflats.com/ecosystem/register/home-loans-finance" className="text-emerald-400 hover:text-white font-extrabold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
              Partner with MillionFlats <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
