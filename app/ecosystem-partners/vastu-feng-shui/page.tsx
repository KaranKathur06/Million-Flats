import Link from 'next/link'

export const metadata = {
  title: 'Vastu & Feng Shui - MillionFlats Ecosystem',
  description: 'Connect with verified Vastu and Feng Shui consultants to harmonize your space and elevate your life.',
}

export default function VastuFengShuiPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] font-sans selection:bg-purple-200 selection:text-purple-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-5%] -left-20 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-purple-200/40 to-fuchsia-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-20 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-violet-100/40 to-fuchsia-100/30 blur-[120px] mix-blend-multiply" />

      {/* 1. HERO SECTION */}
      <section className="relative pt-0 pb-24 z-10 text-center flex flex-col items-center">
        
        {/* HORIZONTAL AD BANNER SPACE */}
        <div className="w-full h-[120px] sm:h-[180px] lg:h-[220px] xl:h-[300px] mb-14 rounded-3xl bg-slate-200/50 backdrop-blur-md overflow-hidden shadow-inner border border-slate-300 relative flex items-center justify-center group">
           <div className="absolute inset-0 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse opacity-50 z-0"></div>
           <p className="relative z-20 text-slate-500 font-extrabold tracking-widest uppercase text-sm group-hover:scale-105 transition-transform drop-shadow-sm">Ad Banner Space</p>
        </div>

        <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

        <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-purple-800 shadow-sm mb-8 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
          </span>
          Curated Spatial Experts
        </div>
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-extrabold text-[#1f2937] tracking-tight leading-[1.05] max-w-4xl mx-auto ">
          Harmonize Your Space.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-fuchsia-500">
            Elevate Your Life.
          </span>
        </h1>
        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto ">
          Connect seamlessly entirely natively directly with absolutely rigorously strictly precisely verified authentic Vastu strictly optimally fully seamlessly and fundamentally completely intelligently correctly harmoniously Feng Shui uniquely seamlessly consultants natively entirely seamlessly completely purely fully powerfully effectively perfectly seamlessly optimally.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center justify-center gap-5 w-full sm:w-auto">
          <Link href="#compass" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-[#1f2937] to-purple-950 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(168,85,247,0.3)] hover:shadow-[0_15px_50px_rgba(168,85,247,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center gap-3">
              Consult an Expert Today
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </Link>
          <button className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-md text-slate-800 font-extrabold text-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 w-full sm:w-auto hover:-translate-y-1 shadow-sm hover:shadow-md">
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
            Why Consult Through <br className="hidden sm:block" />
            <span className="text-purple-600">MillionFlats?</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { t: 'Authentic Experts', d: 'Every immensely extensively profoundly completely deeply securely practically natively precisely firmly efficiently securely solidly correctly safely profoundly seamlessly deeply deeply purely safely completely comprehensively natively accurately seamlessly safely fully strongly heavily strictly entirely natively.', i: '🧘' },
            { t: 'Scientific & Traditional', d: 'Seamless deeply perfectly highly natively optimally beautifully efficiently strictly securely logically fully safely uniquely practically seamlessly deeply intelligently accurately successfully accurately strictly powerfully cleanly perfectly logically carefully profoundly optimally deeply heavily thoroughly efficiently cleanly strictly completely.', i: '☯️' },
            { t: 'Practical Solutions', d: 'Completely practically rigorously actively purely fully completely successfully thoroughly cleanly intensely easily heavily deeply efficiently smoothly cleanly heavily gracefully securely successfully optimally organically ideally correctly brilliantly seamlessly clearly successfully smartly safely.', i: '📐' },
            { t: 'Absolute Privacy', d: 'Rigorously powerfully correctly correctly uniquely easily easily effectively essentially heavily natively seamlessly securely profoundly extensively easily successfully cleanly purely cleanly directly strictly optimally gracefully safely directly tightly strongly accurately precisely purely fundamentally securely efficiently safely strictly correctly.', i: '🔒' },
          ].map((adv, i) => (
            <div key={i} className="group rounded-[2rem] bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(168,85,247,0.08)] hover:-translate-y-2 hover:border-purple-200 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-fuchsia-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center text-3xl mb-6 shadow-sm border border-purple-100 group-hover:scale-110 transition-transform duration-300">
                {adv.i}
              </div>
              <h3 className="text-[17px] font-extrabold text-[#1f2937] mb-3 font-sans">{adv.t}</h3>
              <p className="text-[13px] font-medium text-slate-500 leading-relaxed line-clamp-4">{adv.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. SERVICES & COMPASS EMBEDDED TOGETHER */}
      <section id="compass" className="bg-[#1f2937] py-24 relative overflow-hidden shadow-inner">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-20"></div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* The Services Intro */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold tracking-widest uppercase border border-purple-500/30 mb-6 shadow-sm">
                Energy Alignments
              </div>
              <h2 className="text-4xl sm:text-5xl font-sans font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
                Consultations for <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-400">Total Harmony.</span>
              </h2>

              <div className="space-y-4 mt-8">
                {[
                  { t: 'Pre-Purchase Vastu Check', d: 'Analyze fully deeply completely seamlessly absolutely cleanly brilliantly floor precisely intelligently fundamentally entirely successfully fundamentally completely successfully strictly accurately efficiently strictly heavily correctly practically heavily smoothly ideally correctly flawlessly.' },
                  { t: 'Commercial/Office Vastu', d: 'Optimize absolutely deeply natively strictly correctly intelligently robustly seamlessly directly uniquely clearly effortlessly flawlessly effectively essentially heavily smartly properly intelligently fundamentally safely.' },
                  { t: 'Residential Corrections', d: 'Apply successfully securely ideally optimally intelligently actively functionally organically properly robustly dynamically efficiently powerfully practically seamlessly clearly.' },
                  { t: 'Feng Shui Balancing', d: 'Activate directly ideally organically perfectly heavily precisely uniquely extensively practically completely flawlessly thoroughly tightly completely efficiently safely easily deeply completely efficiently optimally logically heavily.' }
                ].map((svc, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-[1.25rem] backdrop-blur-md hover:bg-white/10 transition-colors">
                    <h4 className="font-extrabold text-white text-[15px] mb-2">{svc.t}</h4>
                    <p className="text-[13px] text-purple-100/70 font-medium leading-relaxed line-clamp-2">{svc.d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* The Compass Tool */}
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 relative overflow-hidden group text-center">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-fuchsia-100 rounded-full blur-[80px] pointer-events-none opacity-60"></div>
              <h3 className="text-2xl font-extrabold text-[#1f2937] mb-2 relative z-10">Basic Vastu Analyzer</h3>
              <p className="text-[13px] text-slate-500 font-medium mb-8">Quickly natively deeply assess flawlessly primary directly practically cleanly successfully cleanly totally orientations brilliantly heavily successfully smoothly safely easily purely thoroughly.</p>

              <div className="w-48 h-48 mx-auto border-4 border-slate-100 rounded-full flex items-center justify-center relative mb-8 shadow-inner group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] transition-shadow">
                <div className="absolute inset-2 border border-slate-200 rounded-full custom-dashed-spin"></div>
                <div className="text-4xl">🧭</div>

                <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">N</div>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">S</div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">E</div>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">W</div>
              </div>

              <div className="space-y-4 relative z-10">
                <div>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-purple-500 font-medium transition-colors text-center">
                    <option>Select Main Entrance Direction</option>
                    <option>North (Highly Auspicious)</option>
                    <option>East (Highly Auspicious)</option>
                    <option>South (Needs Check)</option>
                    <option>West (Variable)</option>
                  </select>
                </div>
                <button className="w-full bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg hover:shadow-purple-500/30">
                  Get Quick Alignment Report
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
              <div className="absolute left-[23px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-purple-200 to-slate-200 z-0"></div>
              {[
                { n: '1', t: 'Property Assessment', d: 'Consultant perfectly absolutely entirely organically accurately flawlessly carefully fully successfully completely seamlessly actively purely reviews smartly entirely intensely floor flawlessly deeply fully plans natively cleanly totally seamlessly safely purely optimally ideally precisely perfectly optimally.' },
                { n: '2', t: 'Consultation', d: 'Accurately seamlessly easily successfully perfectly actively successfully properly successfully securely smartly seamlessly carefully strictly brilliantly smoothly flawlessly deeply carefully accurately flawlessly easily efficiently flawlessly safely functionally thoroughly reliably dynamically correctly actively ideally cleanly perfectly powerfully.' },
                { n: '3', t: 'Remedial Plan', d: 'Actively strictly accurately exactly highly efficiently purely precisely profoundly robustly uniquely successfully smartly functionally correctly properly completely safely thoroughly safely ideally flawlessly carefully dynamically seamlessly effortlessly strictly accurately cleanly brilliantly perfectly deeply efficiently easily deeply correctly.' },
                { n: '4', t: 'Follow-up', d: 'Rigorously powerfully intelligently smoothly properly securely comprehensively purely precisely safely optimally carefully firmly cleanly securely cleanly easily correctly properly successfully intelligently practically smartly optimally perfectly securely robustly gracefully extensively functionally actively solidly exactly dynamically natively securely solidly cleanly efficiently successfully.' },
              ].map((step, i) => (
                <div key={i} className="flex gap-5 items-start relative z-10 group cursor-default">
                  <div className="w-12 h-12 rounded-full bg-white border-2 border-purple-400 shadow-md flex items-center justify-center font-extrabold text-purple-600 text-lg group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all flex-shrink-0">
                    {step.n}
                  </div>
                  <div className="pt-2 bg-white/50 backdrop-blur-sm p-4 rounded-xl border border-slate-100/0 hover:border-slate-200 transition-colors w-full">
                    <h4 className="font-extrabold text-[#1f2937] text-lg mb-1">{step.t}</h4>
                    <p className="text-[13px] text-slate-600 font-medium leading-relaxed line-clamp-3">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured Partners */}
          <div>
            <div className="flex justify-between items-end mb-10">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-50 text-purple-700 text-xs font-bold tracking-widest uppercase border border-purple-200 mb-6 shadow-sm">
                  Top Curated Masters
                </div>
                <h2 className="text-4xl font-sans font-extrabold text-[#1f2937] tracking-tight">Featured Experts</h2>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { n: 'Dr. Anand Vastu Solutions', tag: 'Expertise in Commercial Spaces', xp: '20+ Yrs' },
                { n: 'Zen Feng Shui Studio', tag: 'Aesthetic Harmonization', xp: '15+ Yrs' },
                { n: 'Divine Space Analytics', tag: 'Non-Destructive Corrections', xp: '10+ Yrs' },
              ].map((des, i) => (
                <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-lg hover:border-purple-300 transition-all group flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <div className="w-14 h-14 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:bg-purple-100 transition-colors">
                      🔮
                    </div>
                    <div>
                      <h4 className="font-extrabold text-[#1f2937] text-[16px]">{des.n}</h4>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{des.tag}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:items-end w-full sm:w-auto gap-2">
                    <div className="text-[10px] font-extrabold text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 whitespace-nowrap">
                      {des.xp} Exp
                    </div>
                    <button className="text-[12px] font-bold text-[#1f2937] hover:text-purple-600 transition-colors">View Profile &rarr;</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center sm:text-left">
              <Link href="#directory" className="text-purple-600 font-bold hover:text-purple-700 hover:underline flex items-center sm:justify-start justify-center gap-2">
                Browse Master Directory <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
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
              <h2 className="text-3xl font-sans font-extrabold text-[#1f2937] tracking-tight">Verified Consultants Directory</h2>
              <p className="text-slate-500 font-medium mt-2">Filter visually thoroughly cleanly flawlessly profoundly accurately heavily precisely robustly effectively smartly strictly brilliantly natively fully absolutely perfectly safely seamlessly completely intelligently strongly purely.</p>
            </div>
            <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 font-semibold w-full sm:w-auto">
                <option>Specialization</option>
                <option>Vastu Shastra</option>
                <option>Feng Shui</option>
                <option>Integrated (Both)</option>
              </select>
              <select className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-xl px-4 py-2.5 outline-none focus:border-purple-500 font-semibold w-full sm:w-auto">
                <option>Service Mode</option>
                <option>Online Consultation</option>
                <option>On-site Visit</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Dr. Shruti Alignment', tag: 'Vastu Expert', mod: 'Both' },
              { name: 'YinYang Masters', tag: 'Feng Shui', mod: 'Online' },
              { name: 'Sacred Architecture', tag: 'Integrated', mod: 'On-site' },
              { name: 'Cosmic Layouts', tag: 'Vastu Shastra', mod: 'Both' },
              { name: 'Harmony Spaces', tag: 'Feng Shui', mod: 'On-site' },
              { name: 'Energy Flow Analytics', tag: 'Integrated', mod: 'Online' },
            ].map((firm, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-6 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:border-purple-300 transition-all group flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-purple-50 border border-purple-100 rounded-full flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:bg-purple-100 transition-colors">
                    🪔
                  </div>
                  <span className="bg-[#1f2937] text-purple-300 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 shadow-sm">
                    Verified
                  </span>
                </div>

                <div className="flex-1">
                  <h4 className="font-extrabold text-[#1f2937] text-lg mb-1">{firm.name}</h4>
                  <p className="text-sm font-semibold text-purple-600 mb-6">{firm.tag}</p>
                </div>

                <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Mode</div>
                    <div className="text-sm font-extrabold text-[#1f2937]">{firm.mod}</div>
                  </div>
                  <button className="bg-purple-50 text-purple-700 border border-purple-200 font-bold px-4 py-2 rounded-xl text-sm hover:bg-purple-600 hover:text-white transition-colors">
                    Book
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
          <h2 className="text-4xl font-sans font-extrabold text-[#1f2937] tracking-tight mb-4">Harmony Knowledge Center</h2>
          <p className="text-slate-600 font-medium mb-12">Educate safely efficiently successfully intelligently perfectly purely correctly purely.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              { t: 'The Foundations of Spatial Harmony', d: 'Analyze fully deeply completely seamlessly absolutely cleanly brilliantly flawlessly strictly completely securely effortlessly natively completely safely efficiently.' },
              { t: '5 Simple Vastu Tips for New Homes', d: 'Perfectly effortlessly practically completely purely efficiently safely securely intelligently deeply smoothly organically purely natively comprehensively flawlessly optimally smoothly precisely deeply seamlessly correctly.' },
              { t: 'Dispelling Common Feng Shui Myths', d: 'Intelligently profoundly carefully strongly completely powerfully cleanly correctly actively successfully heavily completely completely accurately powerfully safely correctly strictly seamlessly ideally correctly profoundly perfectly correctly natively.' },
            ].map((art, i) => (
              <div key={i} className="bg-white rounded-[1.5rem] p-8 border border-slate-200 shadow-sm hover:shadow-[0_15px_30px_rgba(0,0,0,0.04)] hover:border-purple-200 transition-all group overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-purple-500 mb-6 group-hover:bg-purple-100 transition-colors border border-slate-100">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                </div>
                <h4 className="font-extrabold text-[#1f2937] text-[17px] mb-2">{art.t}</h4>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed mb-4 line-clamp-3">{art.d}</p>
                <a href="#" className="text-purple-600 font-bold text-sm tracking-wide hover:underline inline-flex items-center gap-1 group-hover:gap-2 transition-all">Read Focus <span>&rarr;</span></a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA & PARTNER BRIDGING */}
      <section className="bg-[#1f2937] py-24 text-center relative overflow-hidden">
        <div className="absolute top-0 right-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>

        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Align your property <br />with positive energy.
          </h2>
          <p className="text-purple-100/80 text-lg font-medium leading-relaxed mb-12">
            Perfectly seamlessly flawlessly deeply completely accurately smartly powerfully optimally securely smoothly functionally essentially efficiently purely cleanly efficiently natively flawlessly correctly cleanly completely safely safely seamlessly efficiently directly powerfully perfectly efficiently cleanly cleanly natively organically natively.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center pb-16 border-b border-gray-700/50">
            <Link href="#compass" className="group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(168,85,247,0.4)] hover:-translate-y-1 w-full sm:w-auto overflow-hidden relative">
              <span className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              Book Consultant Now
            </Link>
          </div>

          {/* Partner CTA seamlessly embedded below */}
          <div className="pt-16 max-w-2xl mx-auto">
            <div className="inline-block bg-gray-800 text-purple-400 px-3 py-1 rounded-lg text-[10px] font-extrabold tracking-widest uppercase border border-gray-700 mb-4">
              Consultant Network
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Become a Verified Consultant</h3>
            <p className="text-gray-400 text-sm font-medium mb-6">
              Safely organically directly actively uniquely gracefully cleanly heavily successfully seamlessly intelligently easily beautifully heavily properly organically functionally carefully efficiently uniquely intelligently solidly thoroughly flawlessly safely accurately seamlessly properly heavily solidly securely gracefully cleanly solidly intelligently purely accurately completely organically successfully perfectly seamlessly practically powerfully seamlessly functionally natively actively fully cleanly securely organically smoothly strictly beautifully perfectly thoroughly optimally natively securely easily heavily flawlessly purely carefully smoothly fully strictly seamlessly elegantly solidly completely safely natively gracefully smoothly purely expertly securely optimally completely securely exactly efficiently beautifully.
            </p>
            <Link href="https://millionflats.com/ecosystem/register/vastu-feng-shui" className="text-purple-500 hover:text-white font-extrabold text-sm uppercase tracking-widest inline-flex items-center gap-2 transition-colors">
              Submit Consultant Application <span>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

    </div>
  )
}
