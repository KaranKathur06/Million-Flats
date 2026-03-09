import Link from 'next/link'

export const metadata = {
  title: 'Interior Design & Renovation - MillionFlats Ecosystem',
  description: 'From concept to completion, connect with top-tier interior designers and renovation experts.',
}

export default function InteriorDesignPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-rose-200 selection:text-rose-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-rose-200/40 to-pink-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-fuchsia-100/40 to-orange-100/30 blur-[120px] mix-blend-multiply" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-0 pb-24 z-10 text-center flex flex-col items-center">
        
        {/* HORIZONTAL AD BANNER SPACE */}
        <div className="w-full h-[120px] sm:h-[180px] lg:h-[220px] xl:h-[300px] mb-14 rounded-3xl bg-slate-200/50 backdrop-blur-md overflow-hidden shadow-inner border border-slate-300 relative flex items-center justify-center group">
           <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse opacity-50 z-0"></div>
           <p className="relative z-20 text-slate-500 font-extrabold tracking-widest uppercase text-sm group-hover:scale-105 transition-transform drop-shadow-sm">Ad Banner Space</p>
        </div>

        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

        <div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-rose-700 shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
          </span>
          Curated Design Experts
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-extrabold text-[#111827] tracking-tight leading-[1.05] max-w-4xl mx-auto ">
          Design Your Dream Space.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-fuchsia-600">
            Bring It to Life.
          </span>
        </h1>
        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto ">
          From concept to completion, flawlessly connect with top-tier interior designers and renovation experts vetted for absolute creativity, reliability, and seamless execution.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center justify-center gap-5 w-full sm:w-auto">
          <Link href="#quiz" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-[#111827] to-rose-950 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(225,29,72,0.3)] hover:shadow-[0_15px_50px_rgba(225,29,72,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center gap-3">
              Find My Designer
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </Link>
          <button className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-md text-slate-800 font-extrabold text-lg hover:border-rose-300 hover:bg-rose-50 transition-all duration-300 w-full sm:w-auto hover:-translate-y-1 shadow-sm hover:shadow-md">
            View Design Gallery
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
          <h2 className="text-4xl font-sans font-extrabold text-[#111827] tracking-tight">
            Why Hire Through <br className="hidden sm:block" />
            <span className="text-rose-600">MillionFlats?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: 'Vetted Expertise', d: 'Every exclusive partner is reviewed for absolute design quality, elite project management, and verified client satisfaction.', i: '✨' },
            { t: 'Transparent Pricing', d: 'Strictly understand clear cost structures—fixed-fee, per-sq-ft, or packaged deals natively before execution.', i: '💎' },
            { t: '3D Visualization Tech', d: 'Partners seamlessly use 3D renders so you precisely see your flawless design before a single wall is touched.', i: '🖥️' },
            { t: 'Seamless Coordination', d: 'Your designer manages contractors, sourcing, and strict timelines, providing a single point of unified contact.', i: '🧑‍🎨' },
          ].map((adv, i) => (
            <div key={i} className="group rounded-[2rem] bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(225,29,72,0.08)] hover:-translate-y-2 hover:border-rose-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-400 to-fuchsia-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-3xl mb-6 shadow-sm border border-rose-100 group-hover:scale-110 transition-transform duration-300">
                {adv.i}
              </div>
              <h3 className="text-[17px] font-extrabold text-[#111827] mb-3 font-sans">{adv.t}</h3>
              <p className="text-[14px] font-medium text-slate-600 leading-relaxed">{adv.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SERVICES & STYLE QUIZ EMBEDDED TOGETHER */}
      <section id="quiz" className="bg-[#111827] py-24 relative overflow-hidden shadow-inner">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20"></div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* The Services Intro */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold tracking-widest uppercase border border-rose-500/30 mb-6 shadow-sm">
                Tailored Spaces
              </div>
              <h2 className="text-4xl sm:text-5xl font-sans font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
                Services for Every Vision <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-fuchsia-400">and Budget.</span>
              </h2>

              <div className="space-y-4 mt-8">
                {[
                  { t: 'For New Homeowners', d: 'Complete full-home interior design, exclusive move-in ready packages, layout and space planning natively.' },
                  { t: 'For Upgraders & Renovators', d: 'Luxury kitchen & bathroom remodels, premium living room architectural makeovers, advanced smart lighting design.' },
                  { t: 'For NRIs & Remote Investors', d: 'Strictly turnkey design precisely for luxury rental properties, staging for extremely high-yield resale, remote project management.' },
                  { t: 'General Space Styling', d: 'Premium aesthetic design consultation, strictly modular kitchen & wardrobe ergonomic solutions, high-end decor & styling.' }
                ].map((svc, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-[1.25rem] backdrop-blur-md hover:bg-white/10 transition-colors">
                    <h4 className="font-extrabold text-white text-[15px] mb-2">{svc.t}</h4>
                    <p className="text-[13px] text-rose-200/80 font-medium leading-relaxed">{svc.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* The Discovery Quiz */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 relative overflow-hidden group text-center">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-fuchsia-100 rounded-full blur-[80px] pointer-events-none opacity-60"></div>
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl mx-auto mb-6 relative z-10 group-hover:scale-110 transition-transform">
                🎨
              </div>
              <h3 className="text-2xl font-extrabold text-[#111827] mb-2 relative z-10">Discover Your Aesthetic</h3>
              <p className="text-[14px] text-slate-500 font-medium mb-8">Take our intelligent 2-minute visual style quiz to get instantly matched exclusively with designers specializing perfectly in your aesthetic.</p>

              <div className="space-y-4 relative z-10">
                <button className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-extrabold py-5 rounded-2xl transition-all shadow-lg hover:shadow-rose-500/30 text-lg flex items-center justify-center gap-3">
                  Start Style Quiz <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
                <div className="text-xs font-bold text-slate-400 tracking-wide uppercase mt-4">Takes approximately 60 Seconds</div>

                <div className="flex justify-center gap-2 mt-6">
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group-hover:border-rose-300 transition-colors">
                    <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=200" alt="Modern" className="object-cover w-full h-full opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                  </div>
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group-hover:border-rose-300 transition-colors">
                    <img src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&q=80&w=200" alt="Minimalist" className="object-cover w-full h-full opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                  </div>
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group-hover:border-rose-300 transition-colors">
                    <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=200" alt="Scandi" className="object-cover w-full h-full opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
                  </div>
                </div>
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
            <h2 className="text-4xl font-sans font-extrabold text-[#111827] tracking-tight mb-10">How It Works</h2>

            <div className="space-y-6 relative">
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-rose-200 to-slate-200 z-0"></div>
              {[
                { n: '1', t: 'Define Your Style', d: 'Take our quick aesthetic style quiz natively and comprehensively share your project brief including room count, budget, and desired timeline.' },
                { n: '2', t: 'Get Matched', d: 'We strictly recommend 2-3 verified premium designers whose precise expertise and authentic style perfectly align with your exact vision.' },
                { n: '3', t: 'Consult & Plan', d: 'Experience introductory architecture calls, thoroughly review intelligent initial concepts, analyze transparent quotes, and finalize your elite partner.' },
                { n: '4', t: 'Execute & Enjoy', d: 'Your designer flawlessly oversees the entire flawless project natively—from generating detailed CAD drawings to the absolute final stunning installation.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 items-start relative z-10 group cursor-default">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-rose-400 shadow-md flex items-center justify-center font-extrabold text-rose-600 text-lg group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all flex-shrink-0">
                    {step.n}
                  </div>
                  <div className="pt-2 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-100/0 hover:border-slate-200 transition-colors w-full">
                    <h4 className="font-extrabold text-[#111827] text-lg mb-1">{step.t}</h4>
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
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 text-rose-700 text-xs font-bold tracking-widest uppercase border border-rose-200 mb-6 shadow-sm">
                  Top Design Studios
                </div>
                <h2 className="text-4xl font-sans font-extrabold text-[#111827] tracking-tight">Featured Partners</h2>
              </div>
            </div>

            <div className="space-y-5">
              {[
                { n: 'Aesthetic Studios HQ', tag: 'Luxury Modern Minimalism', img: 'https://images.unsplash.com/photo-1600210491369-e753d80a41f3?auto=format&fit=crop&q=80&w=200' },
                { n: 'Haven Interior Tech', tag: 'Warm & Functional Family Spaces', img: 'https://images.unsplash.com/photo-1598928506311-c55dd5e8e32b?auto=format&fit=crop&q=80&w=200' },
                { n: 'Verve Architecturals', tag: 'Ultra-Premium NRI Turnkey', img: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=200' },
              ].map((des, i) => (
                <div key={i} className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm hover:shadow-lg hover:border-rose-300 transition-all group flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-20 h-20 bg-slate-100 rounded-[1.25rem] overflow-hidden shadow-inner shrink-0 group-hover:shadow-[0_0_15px_rgba(225,29,72,0.3)] transition-all">
                      <img src={des.img} alt={des.n} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#111827] text-lg">{des.n}</h4>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{des.tag}</p>
                      <div className="flex gap-1 mt-2">
                        <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                        <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                        <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 hidden sm:block">
                    <button className="bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 hover:border-rose-200 text-sm font-bold w-10 h-10 rounded-full flex items-center justify-center transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center sm:text-left">
              <Link href="#directory" className="text-rose-600 font-bold hover:text-rose-700 hover:underline flex items-center sm:justify-start justify-center gap-2">
                Explore The Partner Directory <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
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
              <h2 className="text-3xl font-sans font-extrabold text-[#111827] tracking-tight">Design Experts Directory</h2>
              <p className="text-slate-500 font-medium mt-2">Filter visually to strictly find the exact architectural style your property demands.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 font-semibold w-full sm:w-auto">
                <option>Design Style</option>
                <option>Modern Minimalist</option>
                <option>Traditional / Classic</option>
                <option>Scandinavian</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 font-semibold w-full sm:w-auto">
                <option>Service Type</option>
                <option>Full-Service Turnkey</option>
                <option>Consultation Only</option>
                <option>Renovation & Civil</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 font-semibold w-full sm:w-auto">
                <option>Budget Range</option>
                <option>₹5L - ₹15L</option>
                <option>₹15L - ₹50L</option>
                <option>₹50L+ (Luxury)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Studio Elemento', tag: 'Modern Contemporary', loc: 'Delhi NCR', img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=400' },
              { name: 'Livspace Interiors', tag: 'Turnkey Execution', loc: 'Pan India', img: 'https://images.unsplash.com/photo-1600607687644-aac4c153115f?auto=format&fit=crop&q=80&w=400' },
              { name: 'DesignCafe', tag: 'Space Optimisation', loc: 'Mumbai', img: 'https://images.unsplash.com/photo-1598928506311-c55dd5e8e32b?auto=format&fit=crop&q=80&w=400' },
              { name: 'Bonito Designs', tag: 'Bespoke Luxury', loc: 'Bangalore', img: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=400' },
              { name: 'Urban Ladder Tech', tag: 'Modular Finishes', loc: 'Hyderabad', img: 'https://images.unsplash.com/photo-1556817411-31ae72fa3ea8?auto=format&fit=crop&q=80&w=400' },
              { name: 'Aura Aesthetics', tag: 'Minimalist Scandinavian', loc: 'Pune', img: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=400' },
            ].map((firm, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-3 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-rose-200 transition-all group flex flex-col h-full overflow-hidden">
                <div className="w-full h-48 bg-slate-100 rounded-[1.25rem] overflow-hidden relative">
                  <img src={firm.img} alt={firm.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#111827] text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg border border-white flex items-center gap-1 shadow-sm">
                    <svg className="w-3 h-3 text-rose-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Verified
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h4 className="font-extrabold text-[#111827] text-lg mb-1">{firm.name}</h4>
                  <p className="text-sm font-semibold text-rose-600 mb-4">{firm.tag}</p>

                  <div className="border-t border-slate-100 pt-4 flex items-center justify-between mt-auto">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Location Hub</div>
                      <div className="text-sm font-extrabold text-[#111827]">{firm.loc}</div>
                    </div>
                    <button className="bg-slate-50 text-[#111827] border border-slate-200 font-bold px-4 py-2 rounded-xl text-sm hover:bg-rose-50 transition-colors">
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. EDUCATIONAL RESOURCES */}
      <section className="bg-[#fafafa] py-24 border-b border-slate-200 text-center">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-sans font-extrabold text-[#111827] tracking-tight mb-4">Inspiration & Planning Hub</h2>
          <p className="text-slate-600 font-medium mb-12">Educate yourself absolutely flawlessly before finalizing any architectural design execution.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { t: 'How to Budget for a Home Renovation', d: 'A comprehensive strict guide to preventing absolutely catastrophic cost overruns natively.' },
              { t: 'Modular vs. Carpentry', d: 'Understand the distinct pros, precise cons, and lifecycle durability parameters cleanly.' },
              { t: '5 Questions to Ask Your Designer', d: 'Ensure absolute alignment and frictionless transparency with your chosen studio natively.' },
            ].map((art, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)] hover:border-rose-100 transition-all group">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-rose-500 mb-6 group-hover:bg-rose-100 transition-colors border border-slate-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h4 className="font-extrabold text-[#111827] text-lg mb-2">{art.t}</h4>
                <p className="text-[14px] text-slate-500 font-medium leading-relaxed mb-4">{art.d}</p>
                <a href="#" className="text-rose-600 font-bold text-sm tracking-wide hover:underline inline-flex items-center gap-1 group-hover:gap-2 transition-all">Read Insight <span>&rarr;</span></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA & PARTNER BRIDGING */}
      <section className="bg-[#0f172a] py-24 text-center relative overflow-hidden">
        <div className="absolute top-0 right-1/2 w-[600px] h-[600px] bg-rose-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>

        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Your dream home is a <br />great partnership away.
          </h2>
          <p className="text-rose-100/80 text-lg font-medium leading-relaxed mb-12">
            Elevate your space precisely utilizing absolute verified premium aesthetic professionals. Completely stress-free execution directly natively on MillionFlats.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pb-16 border-b border-rose-800/30">
            <Link href="#quiz" className="group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(225,29,72,0.4)] hover:-translate-y-1 w-full sm:w-auto overflow-hidden relative">
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              Start My Design Project
            </Link>
            <button className="flex items-center justify-center h-16 px-12 rounded-2xl border-2 border-rose-800/80 bg-transparent text-white font-extrabold text-lg hover:border-rose-600 hover:bg-rose-900/30 transition-all shadow-sm w-full sm:w-auto">
              Download Pre-Design Checklist
            </button>
          </div>

          {/* Partner CTA seamlessly embedded below */}
          <div className="pt-16 max-w-2xl mx-auto">
            <div className="inline-block bg-rose-900/50 text-rose-300 px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase border border-rose-800/80 mb-4">
              Design Professionals Alliance
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Showcase Your Talent to Homeowners Ready to Invest</h3>
            <p className="text-rose-200/70 text-sm font-medium mb-6">
              Join MillionFlats' curated network of design professionals and intelligently connect with qualified, verified clients actively seeking to renovate, decorate, and strictly transform their spaces.
            </p>
            <Link href="https://millionflats.com/ecosystem/register/interior-design-renovation" className="text-rose-400 hover:text-white font-extrabold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
              Submit Architect / Studio Application <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
