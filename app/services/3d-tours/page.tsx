import Link from 'next/link'
import dynamic from 'next/dynamic'

const TourShowcase = dynamic(() => import('@/components/3DTourShowcase'), {
  ssr: false,
  loading: () => (
    <div className="py-24 text-center text-slate-400">
      <div className="inline-flex items-center gap-3 text-sm font-semibold">
        <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        Loading showcase...
      </div>
    </div>
  ),
})

export const metadata = {
  title: '3D Development Solutions - MillionFlats x Meta-dology',
  description: "The world's most advanced 3D development platform for property developers.",
}

export default function Service3DToursPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-amber-200 selection:text-amber-900 flex flex-col relative overflow-hidden">

      {/* Background Orbs */}
      <div className="pointer-events-none absolute top-[-10%] -left-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/20 blur-[100px] mix-blend-multiply" />
      <div className="pointer-events-none absolute top-40 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-blue-100/40 to-cyan-100/30 blur-[120px] mix-blend-multiply" />

      {/* Hero Section */}
      <section className="relative pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 backdrop-blur-md px-5 py-2 text-sm font-bold text-amber-700 shadow-sm mb-10 transition-transform hover:scale-105 duration-300">
          <span className="relative flex h-2.5 w-2.5 mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          MillionFlats × Meta-dology
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-sans font-extrabold text-dark-blue tracking-tight leading-[1.05] max-w-4xl mx-auto">
          Build <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">smarter.</span><br />
          <span className="text-slate-400">Sell faster.</span>
        </h1>

        <p className="mt-8 text-xl text-slate-600 leading-relaxed font-medium max-w-2xl mx-auto">
          The world&apos;s most advanced 3D development platform — for property developers, builders, consultants, port & marine authorities, and city planners. From first sketch to final sale, in one living, breathing digital world.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-5 w-full sm:w-auto">
          <Link href="/contact" className="group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-dark-blue to-slate-900 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(15,23,42,0.3)] hover:shadow-[0_15px_50px_rgba(15,23,42,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto">
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black"></span>
            <span className="relative z-10 flex items-center gap-3">
              Book a Free Demo
              <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </span>
          </Link>
          <Link href="/contact" className="inline-flex items-center justify-center h-16 px-10 rounded-2xl border-2 border-slate-200 bg-white/60 backdrop-blur-md text-slate-800 font-extrabold text-lg hover:border-amber-300 hover:bg-amber-50 transition-all duration-300 w-full sm:w-auto hover:-translate-y-1 shadow-sm hover:shadow-md">
            Book a Meeting
          </Link>
        </div>

        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t border-slate-200/60 w-full max-w-5xl mx-auto relative relative z-10">
          {[
            { v1: '8', v2: '11', s: '-', p: '%', l: 'Avg Cost Savings' },
            { v1: '72', s: 'h', l: 'Rapid Prototype' },
            { v1: '4', l: 'Stage Process' },
            { v1: '1', l: 'Platform' },
          ].map((st, i) => (
            <div key={i} className="group p-6 rounded-[2rem] bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-2 hover:border-amber-200 transition-all duration-300 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
              <div className="text-4xl md:text-5xl font-sans font-extrabold text-dark-blue mb-2 transition-transform group-hover:scale-110 duration-300">
                {st.v1}{st.s && <span className="text-amber-500">{st.s}</span>}{st.v2}{st.p && <span className="text-amber-500">{st.p}</span>}
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500 font-bold bg-slate-50 inline-block px-3 py-1 rounded-lg border border-slate-100 mt-2">{st.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* TICKER / TAGS */}
      <div className="bg-dark-blue py-8 overflow-hidden relative border-y border-slate-800 shadow-inner z-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4wNCkiLz48L3N2Zz4=')] mix-blend-screen pointer-events-none"></div>
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[13px] font-mono font-semibold text-slate-400 uppercase tracking-widest">
            <span className="text-amber-400 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>Property Development</span>
            <span className="hover:text-white transition-colors cursor-default">Residential</span>
            <span className="hover:text-white transition-colors cursor-default">Commercial</span>
            <span className="text-amber-400 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>Port & Marine</span>
            <span className="hover:text-white transition-colors cursor-default">City Planning</span>
            <span className="hover:text-white transition-colors cursor-default">Mixed-Use</span>
            <span className="text-amber-400 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>Construction</span>
            <span className="hover:text-white transition-colors cursor-default">Offshore</span>
            <span className="hover:text-white transition-colors cursor-default">Infrastructure</span>
          </div>
        </div>
      </div>

      {/* WHO IS THIS FOR */}
      <section className="relative px-4 sm:px-6 lg:px-8 max-w-[1240px] mx-auto w-full z-10 py-24">
        <div className="mb-16 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 text-amber-600 text-xs font-bold tracking-widest uppercase border border-amber-200 mb-6 shadow-sm">
            Who This Is For
          </div>
          <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-dark-blue tracking-tight">
            Built for the people who <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">build</span> the world.
          </h2>
          <p className="mt-6 text-slate-600 max-w-2xl text-lg font-medium leading-relaxed">
            Whether you&apos;re planning a township, developing a port, designing a city district, or selling luxury residences - this platform transforms how you plan, align, and go to market.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { i: '🏗️', t: 'Property Developers', d: 'Residential, commercial, mixed-use, and off-plan developers who need to visualise their development, align stakeholders, and sell units before a single brick is laid.', tags: ['Residential', 'Commercial'] },
            { i: '👷', t: 'Builders & Contractors', d: 'Construction companies and main contractors who need crystal-clear 3D models to coordinate subcontractors, catch design oversights before they cost money, and reduce costly variations.', tags: ['General', 'Civil Works'] },
            { i: '📐', t: 'Architects & Consultants', d: 'Design consultants, architects, planning firms, and quantity surveyors who need real-time 3D models to present concepts to clients, win approvals faster, and eliminate rework.', tags: ['Architecture', 'Urban Planning'] },
            { i: '⚓', t: 'Port & Marine Industry', d: 'Port authorities, marine terminal developers, offshore facility planners, and shipyard developers who require large-scale 3D models integrating GIS data, utility grids, and environmental conditions.', tags: ['Ports', 'Terminals'] },
            { i: '🏙️', t: 'City & Urban Development', d: 'Municipal authorities, smart city planners, urban bodies, and government agencies developing master plans, new towns, and infrastructure at city scale — needing community buy-in.', tags: ['Smart Cities', 'Master Plans'] },
            { i: '🏨', t: 'Property Owners & Investors', d: 'Individual property owners, REITs, family offices, and investors developing or repositioning assets — needing compelling visual tools to attract co-investors, tenants, or buyers.', tags: ['REITs', 'Investors'] },
          ].map((cat, i) => (
            <div key={i} className="group rounded-[2rem] bg-white border border-slate-100 p-8 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(245,158,11,0.08)] hover:-translate-y-2 hover:border-amber-200 transition-all duration-300 relative overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-3xl mb-6 shadow-sm border border-amber-100 group-hover:scale-110 group-hover:bg-amber-100 transition-transform duration-300">
                <span className="group-hover:animate-bounce">{cat.i}</span>
              </div>
              <h3 className="text-xl font-extrabold text-dark-blue mb-3 font-sans leading-tight">{cat.t}</h3>
              <p className="text-[15px] font-medium text-slate-600 leading-relaxed mb-8">{cat.d}</p>
              <div className="flex flex-wrap gap-2 mt-auto">
                {cat.tags.map(t => (
                  <span key={t} className="bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide group-hover:bg-amber-50 group-hover:text-amber-700 group-hover:border-amber-200 transition-colors">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PLATFORM 4 STAGES */}
      <section className="bg-gradient-to-b from-white to-slate-50 py-24 border-t border-slate-200 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-100/40 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="mb-16 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold tracking-widest uppercase border border-blue-200 mb-6 shadow-sm">
              The Platform
            </div>
            <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-dark-blue tracking-tight leading-[1.1]">
              One platform. <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Four stages.</span><br />
              Zero confusion.
            </h2>
            <p className="mt-6 text-slate-600 max-w-2xl text-lg font-medium leading-relaxed">
              From concept sketch to live sales suite — a single, connected 3D workflow that eliminates fragmented tools, outdated plans, and costly miscommunication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '01', ic: '🛰️', t: 'Rapid Prototype', d: 'With as little as a sketch and GPS coordinates, we build a full high-fidelity 3D model of your development in 72 hours. Satellite-scanned surroundings, sun-mapped lighting.', c: 'from-blue-500 to-cyan-500' },
              { num: '02', ic: '🔄', t: 'Real-Time Adjustments', d: 'All stakeholders — developer, engineer, architect, planning authority — view the same live model and make changes in real time. Say goodbye to outdated 2D plans.', c: 'from-amber-400 to-orange-500' },
              { num: '03', ic: '🔬', t: 'Clarity for Construction', d: 'Peel away layers to reveal what\'s underneath — electrical conduits, water pipes, air vents, utility grids, GIS data, demographic insights, and municipal zoning.', c: 'from-purple-500 to-pink-500' },
              { num: '04', ic: '🚀', t: 'Go to Market', d: 'The planning tool becomes the sales platform. Integrated CRM, payment portal, virtual models, agent management, meeting tools, and guided buyer tours in one.', c: 'from-emerald-400 to-teal-500' },
            ].map((stage, i) => (
              <div key={i} className="group rounded-[2.5rem] bg-white border border-slate-100 p-8 relative overflow-hidden shadow-sm hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-500">
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${stage.c} transform origin-left scale-x-50 group-hover:scale-x-100 transition-transform duration-500`}></div>
                <div className="flex justify-between items-start mb-6">
                  <div className="text-[10px] font-extrabold tracking-[0.2em] text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    STAGE {stage.num}
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-sm border border-slate-100">
                    {stage.ic}
                  </div>
                </div>
                <h3 className="text-xl font-extrabold text-dark-blue mb-3 font-sans group-hover:text-slate-900 transition-colors">{stage.t}</h3>
                <p className="text-[15px] font-medium text-slate-600 leading-relaxed">{stage.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VIDEO & IMAGE SHOWCASE — injected between stages and cost savings */}
      <TourShowcase />

      {/* COST SAVINGS */}
      <section className="bg-slate-900 py-24 relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTQiIGN5PSIxNCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSLCAyNTUsIDAuMSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] opacity-40"></div>

        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div className="lg:pr-10 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold tracking-widest uppercase border border-amber-500/30 mb-6 shadow-sm">
                Why It Pays for Itself
              </div>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-sans font-extrabold mb-6 text-white tracking-tight leading-[1.1]">
                Every project saves<br />
                more than it <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500 italic">costs.</span>
              </h2>
              <p className="text-slate-300 text-lg font-medium leading-relaxed mb-10">
                The platform pays for itself — and then some — by eliminating the hidden costs that bleed every development project. Average savings of 8–11% across the lifecycle.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left">
                {[
                  { t: 'Design Oversights', d: 'Catch conflicts in 3D before site variations.' },
                  { t: 'Render Costs Eliminated', d: 'The live 3D model IS the marketing material.' },
                  { t: 'Faster Funding', d: 'Visualised prototype accelerates confidence.' },
                  { t: 'Marketing Video Costs', d: 'Interactive 3D replaces physical show suites.' }
                ].map((ft, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[1.5rem] backdrop-blur-md hover:bg-white/10 transition-colors group">
                    <h4 className="font-bold text-white mb-2 text-[15px] flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 group-hover:scale-150 group-hover:shadow-[0_0_10px_rgba(251,191,36,0.5)] transition-all"></span>
                      {ft.t}
                    </h4>
                    <p className="text-[13px] text-slate-400 font-medium leading-relaxed">{ft.d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-10 md:p-14 rounded-[3rem] relative shadow-2xl overflow-hidden hover:shadow-[0_30px_60px_rgba(0,0,0,0.2)] transition-shadow duration-500">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-100 rounded-full blur-[80px] pointer-events-none opacity-60"></div>
              <div className="relative z-10 text-center text-dark-blue">
                <div className="text-7xl sm:text-9xl font-sans font-extrabold leading-none mb-4 drop-shadow-sm">
                  8<span className="text-amber-500">-</span><br />11<span className="text-amber-500">%</span>
                </div>
                <div className="text-xs tracking-[0.2em] uppercase text-slate-500 mb-12 font-extrabold">Average project cost savings</div>

                <div className="space-y-7 text-left">
                  {[
                    { l: 'Design oversight catch', p: '90%' },
                    { l: 'Render cost elimination', p: '100%' },
                    { l: 'Faster funding access', p: '75%' },
                    { l: 'Reduced marketing spend', p: '85%' },
                    { l: 'Fewer variation orders', p: '70%' },
                  ].map((b, i) => (
                    <div key={i} className="group cursor-default">
                      <div className="flex justify-between text-[13px] font-bold mb-2 text-slate-700 group-hover:text-amber-600 transition-colors">
                        <span>{b.l}</span>
                        <span className="text-amber-600 font-extrabold">{b.p}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                        <div
                          className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full relative overflow-hidden group-hover:brightness-110 transition-all"
                          style={{ width: b.p }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[stripes_1s_linear_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PARTNERSHIP */}
      <section className="bg-slate-50 py-24 border-t border-slate-200">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-[3rem] bg-white border border-slate-200 shadow-[0_20px_50px_rgba(0,0,0,0.03)] overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-100/40 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/40 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

            <div className="p-10 md:p-16 lg:p-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">
              <div>
                <div className="flex flex-wrap items-center gap-4 mb-8">
                  <span className="bg-dark-blue text-white font-sans font-extrabold px-5 py-2.5 rounded-xl text-lg tracking-wide shadow-md">MillionFlats</span>
                  <span className="text-slate-300 font-mono font-bold text-xl">×</span>
                  <span className="bg-white border border-slate-200 text-dark-blue font-sans font-extrabold px-5 py-2.5 rounded-xl tracking-wide shadow-sm">Meta-dology</span>
                </div>
                <div className="inline-block bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-[11px] font-extrabold tracking-widest uppercase border border-amber-200 mb-5">
                  Technology Partner
                </div>
                <h2 className="text-4xl sm:text-5xl font-sans font-extrabold text-dark-blue mb-6 tracking-tight leading-tight">Global Leaders in<br />3D Property Experiences</h2>
                <div className="space-y-5 text-slate-600 font-medium leading-relaxed text-[15px]">
                  <p>Meta-dology built the technology that powers what you see on this page. They are the world&apos;s foremost specialists in real-time 3D property and development environments — working with developers, builders, and infrastructure bodies across UAE, UK, South Africa, USA, and beyond.</p>
                  <p><strong className="text-dark-blue font-extrabold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">MillionFlats is their official Associate Partner.</strong> When you engage through MillionFlats, you get Meta-dology&apos;s full platform capability with a dedicated team that understands the Indian, South Asian, and Middle East development markets.</p>
                </div>
                <div className="mt-10 bg-slate-50 border border-slate-100 p-5 rounded-2xl flex gap-4 items-start">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                    <strong className="text-dark-blue font-bold">Notice:</strong> The 3D world platform and AI tools are owned by Meta-dology. MillionFlats acts as Associate Partner, providing advisory for clients in India, UAE, and internationally.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-5 relative">
                <div className="absolute left-[39px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-100 z-0 hidden sm:block"></div>
                {[
                  { ic: '🛰️', s: 'Stage 1 — Rapid Prototype in 72h', d: 'Satellite scan, sun mapping, real views from every window — from sketch to full 3D model in 72 hours.' },
                  { ic: '⚡', s: 'Stage 2 — Real-Time Stakeholder Alignment', d: 'Everyone on the same live model. Instant adjustments. No more fragmented PDFs and conflicting versions.' },
                  { ic: '🔬', s: 'Stage 3 — Construction Clarity', d: 'X-ray layers revealing utilities, GIS data, municipal grids, and demographic insights — before you build.' },
                  { ic: '🚀', s: 'Stage 4 — Integrated Sales Suite', d: 'CRM, payment portal, virtual tours, agent manager, lead management — a complete go-to-market platform.' },
                ].map((item, i) => (
                  <div key={i} className="bg-white border border-slate-100 p-6 rounded-[1.5rem] shadow-sm flex flex-col sm:flex-row gap-5 items-start relative z-10 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[1.25rem] bg-amber-50 flex items-center justify-center text-3xl shrink-0 shadow-inner border border-amber-100">
                      {item.ic}
                    </div>
                    <div className="pt-2">
                      <h4 className="font-extrabold text-dark-blue text-[15px] mb-2">{item.s}</h4>
                      <p className="text-[13px] text-slate-500 font-medium leading-relaxed">{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-gradient-to-br from-white to-slate-50 py-32 text-center relative overflow-hidden border-t border-slate-200">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMCwgMCwgMCwgMC4wMikiLz48L3N2Zz4=')] mix-blend-multiply opacity-50 pointer-events-none"></div>
        <div className="absolute top-0 right-1/2 w-96 h-96 bg-amber-100/50 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-100 text-slate-600 text-[11px] font-extrabold tracking-widest uppercase border border-slate-200 mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Ready to Get Started?
          </div>
          <h2 className="text-5xl sm:text-6xl font-sans font-extrabold text-dark-blue leading-[1.1] mb-8 tracking-tight">
            Your project.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 italic">Visualised.</span> Approved. Sold.
          </h2>
          <p className="text-slate-600 text-xl font-medium leading-relaxed mb-12">
            Book a free demo and see your development come to life in 3D — or book a meeting with our team to discuss how this applies to your specific project.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link href="/contact" className="group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-dark-blue to-slate-900 text-white font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(15,23,42,0.4)] hover:-translate-y-1 w-full sm:w-auto relative overflow-hidden">
              <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              Book a Free Demo
            </Link>
            <Link href="/contact" className="flex items-center justify-center h-16 px-12 rounded-2xl border-2 border-slate-200 bg-white text-slate-800 font-extrabold text-lg hover:border-amber-300 hover:bg-amber-50 transition-all shadow-sm hover:shadow-md hover:-translate-y-1 w-full sm:w-auto">
              Book a Meeting
            </Link>
          </div>
          <p className="text-sm font-bold text-slate-400 mt-8 tracking-wide bg-white/50 inline-block px-4 py-2 rounded-full border border-slate-100 backdrop-blur-sm">
            No commitment · Worldwide · Delivered via video call
          </p>
        </div>
      </section>

      {/* Adding a CSS Keyframe for the stripes animation directly inside the component for simplicity */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes stripes {
          0% { background-position: 1rem 0; }
          100% { background-position: 0 0; }
        }
      `}} />

    </div>
  )
}
