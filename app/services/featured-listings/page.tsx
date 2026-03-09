export const metadata = {
  title: 'Featured Listings - MillionFlats',
}

function CheckIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function ServiceFeaturedListingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-amber-200 selection:text-amber-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-20%] -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-amber-100/40 to-yellow-100/30 blur-[120px] mix-blend-multiply" />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-amber-700 shadow-sm mb-10 transition-transform hover:scale-105 duration-300">
          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          Priority Placement Guaranteed
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-serif font-extrabold text-dark-blue tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Get Your Property Seen by <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
            Serious Buyers
          </span>
        </h1>

        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto">
          Premium placement. Verified trust scores. AI-matched leads. Elevate your listing above the noise and capture high-intent buyers instantly.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto">
          <a href="#pricing" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-dark-blue to-blue-900 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(30,58,138,0.3)] hover:shadow-[0_15px_50px_rgba(30,58,138,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="relative z-10 flex items-center gap-3">
              Feature Your Property
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </a>
          <a href="#how" className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-md text-slate-800 font-extrabold text-lg hover:border-amber-300 hover:bg-amber-50 transition-all duration-300 w-full sm:w-auto">
            How It Works
          </a>
        </div>
        <p className="mt-6 text-sm font-semibold text-slate-500">Standard listing is free. Pay only for premium visibility.</p>
      </section>

      {/* Feature Highlight Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-16">
        <div className="bg-white rounded-[3rem] p-10 lg:p-16 border border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.03)] relative overflow-hidden flex flex-col lg:flex-row gap-16 items-center">
          <div className="absolute -top-32 -left-32 w-64 h-64 bg-amber-100 rounded-full blur-[80px]" />

          <div className="lg:w-1/2 relative z-10">
            <h2 className="text-sm font-extrabold tracking-widest text-amber-600 uppercase mb-3">The Advantage</h2>
            <h3 className="text-4xl font-serif font-extrabold text-dark-blue leading-tight mb-6">What Are Featured Listings?</h3>
            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-6">
              Featured Listings on MillionFlats get unconditional priority placement in universally visible areas: search results, category pages, and native AI-driven buyer recommendations.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed font-medium">
              Your property isn't just listed – it’s proactively pushed to high-intent buyers who are actively searching. Premium placements objectively receive <strong className="text-dark-blue bg-amber-100 px-2 py-0.5 rounded">3x more views</strong> and <strong className="text-dark-blue bg-amber-100 px-2 py-0.5 rounded">2x more inquiries</strong> than standard listings.
            </p>
          </div>

          <div className="lg:w-1/2 w-full grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            {[
              { t: 'Top Search Results', d: 'Appear prominently before all non-featured inventory.', i: 'M5 10l7-7m0 0l7 7m-7-7v18' },
              { t: 'Featured Badge', d: 'Stand out visually with a high-trust golden marker.', i: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
              { t: 'AI Match Priority', d: 'Algorithm mathematically favors your listing.', i: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
              { t: 'Verix™ Score', d: 'Showcase absolute verified trust metrics.', i: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
              { t: 'Social Boost', d: 'Feature on our 10K+ reach Instagram/LinkedIn.', i: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' },
              { t: 'WhatsApp Notify', d: 'Injected into weekly alerts to 500+ top agents.', i: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:bg-amber-50 hover:border-amber-200 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-amber-600 mb-4 group-hover:bg-amber-100 group-hover:border-amber-300 transition-colors shadow-sm">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d={f.i} /></svg>
                </div>
                <div className="font-bold text-slate-800 mb-1">{f.t}</div>
                <div className="text-xs text-slate-500 font-medium leading-relaxed">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Steps */}
      <section id="how" className="py-20 bg-dark-blue relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-900 to-indigo-900 pointer-events-none mix-blend-multiply opacity-80" />
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-4xl font-serif font-extrabold text-white mb-16">How It Works</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
            {[
              { s: '01', t: 'List your property', d: 'Start by creating a highly-detailed basic listing totally free of cost.' },
              { s: '02', t: 'Upgrade to Featured', d: 'Select an exclusive duration to secure your premium spot permanently.' },
              { s: '03', t: 'Get verified', d: 'We legally capture Verix™ signals + 3D tour ensuring strict authenticity.' },
              { s: '04', t: 'Reach more buyers', d: 'Sit back as priority algorithms mathematically push leads to you rapidly.' },
            ].map((st, i) => (
              <div key={i} className="relative pt-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-dark-blue border-4 border-blue-600 flex items-center justify-center text-white font-extrabold text-xl shadow-[0_0_20px_rgba(37,99,235,0.4)] relative z-10 -mt-10 mb-6 bg-gradient-to-br from-blue-600 to-indigo-800">
                  {st.s}
                </div>
                <h4 className="text-xl font-bold text-white mb-3">{st.t}</h4>
                <p className="text-blue-200 text-sm font-medium leading-relaxed max-w-[250px] mx-auto">{st.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Modules */}
      <section id="pricing" className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-24 z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-extrabold text-dark-blue tracking-tight">India Pricing – Featured Listings</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg font-medium">Select a duration that strictly fits your aggressive sales timeline.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { term: '1 Month', price: '2,999', label: 'Quick Test', desc: 'Urgent sale or brief market trial', incl: ['Featured Badge', 'Top placement'] },
              { term: '3 Months', price: '7,999', save: '11%', label: 'Standard', desc: 'Standard sale timeline average', incl: ['1mo Benefits', 'Social Media Feature'], highlight: true },
              { term: '6 Months', price: '14,999', save: '17%', label: 'Luxury', desc: 'High-ticket luxury or complex sales', incl: ['3mo Benefits', 'WhatsApp Broadcast', 'Newsletter Feature'] },
              { term: '12 Months', price: '24,999', save: '30%', label: 'Portfolio', desc: 'Ongoing rental/developer portfolio', incl: ['All Benefits', 'VIP Priority Support'] },
            ].map((p, i) => (
              <div key={i} className={`group flex flex-col rounded-[2.5rem] p-8 border hover:-translate-y-2 transition-all duration-300 relative ${p.highlight ? 'bg-gradient-to-b from-dark-blue to-blue-900 border-blue-800 shadow-[0_20px_40px_rgba(30,58,138,0.2)] text-white scale-100 lg:scale-[1.05] z-20' : 'bg-white border-slate-200 shadow-sm hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] text-slate-800'}`}>
                {p.save && (
                  <div className={`absolute -top-3 right-6 px-3 py-1 rounded-full text-xs font-extrabold tracking-widest uppercase ${p.highlight ? 'bg-amber-400 text-dark-blue shadow-lg shadow-amber-500/30' : 'bg-emerald-100 text-emerald-700'}`}>
                    Save {p.save}
                  </div>
                )}
                {p.label && <div className={`text-sm font-extrabold uppercase tracking-widest mb-1 ${p.highlight ? 'text-blue-300' : 'text-slate-500'}`}>{p.label}</div>}
                <h3 className={`text-2xl font-bold mb-4 ${p.highlight ? 'text-white' : 'text-dark-blue'}`}>{p.term}</h3>

                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold tracking-tight">₹{p.price}</span>
                </div>

                <p className={`text-sm font-medium mb-8 ${p.highlight ? 'text-blue-200' : 'text-slate-500'}`}>{p.desc}</p>

                <div className={`flex-grow border-t pt-6 space-y-4 ${p.highlight ? 'border-blue-700/50' : 'border-slate-100'}`}>
                  {p.incl.map((inc, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <CheckIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${p.highlight ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span className={`text-sm font-bold ${p.highlight ? 'text-blue-50' : 'text-slate-700'}`}>{inc}</span>
                    </div>
                  ))}
                </div>

                <a href="/sell" className={`mt-8 block w-full py-4 text-center rounded-2xl font-extrabold transition-all duration-300 ${p.highlight ? 'bg-amber-400 text-dark-blue hover:bg-white' : 'bg-slate-100 text-dark-blue hover:bg-slate-200'}`}>
                  Choose {p.term}
                </a>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-[2px] shadow-xl hover:shadow-2xl transition-shadow duration-300 max-w-4xl mx-auto transform hover:-translate-y-1">
            <div className="bg-white rounded-[calc(1.5rem-2px)] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg>
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-slate-800">3D Tour Special Bundle</h4>
                  <p className="text-slate-600 font-medium">Add an immersive 3D tour at a strict <strong className="text-amber-600 border-b border-amber-300">20% discount</strong> when booking any Featured Listing tier.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col sm:flex-row justify-center gap-5">
            <a href="/sell" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl bg-dark-blue text-white font-extrabold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              List & Feature Now
            </a>
            <a href="/contact" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl border-2 border-slate-200 bg-white text-dark-blue font-extrabold text-lg hover:border-slate-300 hover:bg-slate-50 transition-all duration-300">
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-gradient-to-br from-dark-blue to-blue-900 py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNykiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>
        <div className="max-w-4xl mx-auto relative z-10">
          <h2 className="text-white font-serif font-extrabold text-5xl tracking-tight leading-tight">Secure Premium Eyeballs Today</h2>
          <p className="text-blue-200 mt-6 text-xl font-medium max-w-2xl mx-auto leading-relaxed">Don't let your luxury property drown in thousands of standard additions. Get seen by ultra-serious buyers who hold verified purchasing intent.</p>

          <div className="mt-10 mb-8 pt-8 border-t border-blue-800/80">
            <div className="inline-flex items-center gap-3 bg-white/10 px-6 py-2 rounded-full border border-white/20">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-white font-bold text-sm tracking-widest uppercase">Includes priority search placement automatically</span>
            </div>
          </div>

          <a href="#pricing" className="inline-flex items-center justify-center h-16 px-12 rounded-2xl bg-white text-dark-blue font-extrabold text-lg shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300">
            View Featured Packages
          </a>
        </div>
      </section>

    </div>
  )
}
