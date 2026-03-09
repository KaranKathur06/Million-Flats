import Link from 'next/link'

export const metadata = {
  title: '3D Development Solutions - MillionFlats x Meta-dology',
  description: 'The world\'s most advanced 3D development platform for property developers.',
}

export default function Service3DToursPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ══ HERO ══ */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-16">
          <div className="max-w-4xl relative z-10">
            <div className="inline-flex items-center gap-3 text-sm font-bold tracking-widest uppercase text-amber-500 mb-6">
              <span className="w-8 h-[2px] bg-amber-500"></span>
              MillionFlats × Meta-dology
            </div>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-sans font-bold text-dark-blue leading-tight">
              Build <span className="text-amber-500">smarter.</span><br />
              <span className="text-gray-400">Sell faster.</span>
            </h1>
            <p className="mt-6 text-xl text-gray-600 leading-relaxed max-w-2xl">
              The world&apos;s most advanced 3D development platform — for property developers, builders, consultants, port & marine authorities, and city planners. From first sketch to final sale, in one living, breathing digital world.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link href="/contact" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                Book a Free Demo
              </Link>
              <Link href="/contact" className="inline-flex items-center justify-center h-12 px-8 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50 transition-all">
                Book a Meeting
              </Link>
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-6 pt-10 border-t border-gray-100">
            <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-sm text-center lg:text-left">
              <div className="text-3xl font-sans font-bold text-dark-blue">8<span className="text-amber-500">-</span>11<span className="text-amber-500">%</span></div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mt-1 font-semibold">Avg Cost Savings</div>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-sm text-center lg:text-left">
              <div className="text-3xl font-sans font-bold text-dark-blue">72<span className="text-amber-500">h</span></div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mt-1 font-semibold">Rapid Prototype</div>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-sm text-center lg:text-left">
              <div className="text-3xl font-sans font-bold text-dark-blue">4</div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mt-1 font-semibold">Stage Process</div>
            </div>
            <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-sm text-center lg:text-left">
              <div className="text-3xl font-sans font-bold text-dark-blue">1</div>
              <div className="text-xs uppercase tracking-wider text-gray-500 mt-1 font-semibold">Platform</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ TICKER / TAGS ══ */}
      <div className="bg-gray-50 py-6 overflow-hidden border-y border-gray-200">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-mono text-gray-500 uppercase tracking-widest">
            <span className="text-amber-600 font-bold">Property Development</span>
            <span>Residential</span>
            <span>Commercial</span>
            <span className="text-amber-600 font-bold">Port & Marine</span>
            <span>City Planning</span>
            <span>Mixed-Use</span>
            <span className="text-amber-600 font-bold">Construction</span>
            <span>Offshore</span>
            <span>Infrastructure</span>
          </div>
        </div>
      </div>

      {/* ══ WHO IS THIS FOR ══ */}
      <section className="bg-white py-20 border-b border-gray-200">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-3 text-xs font-bold tracking-widest uppercase text-amber-500 mb-4">
              Who This Is For
            </div>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold text-dark-blue">Built for the people who <span className="text-amber-500 italic">build</span> the world.</h2>
            <p className="mt-4 text-gray-600 max-w-2xl leading-relaxed">Whether you&apos;re planning a township, developing a port, designing a city district, or selling luxury residences — this platform transforms how you plan, align, and go to market.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left text-amber-500">🏗️</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Property Developers</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">Residential, commercial, mixed-use, and off-plan developers who need to visualise their development, align stakeholders, and sell units before a single brick is laid.</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Residential</span>
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Commercial</span>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left text-amber-500">👷</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Builders & Contractors</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">Construction companies and main contractors who need crystal-clear 3D models to coordinate subcontractors, catch design oversights before they cost money, and reduce costly variations.</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">General</span>
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Civil Works</span>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left text-amber-500">📐</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Architects & Consultants</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">Design consultants, architects, planning firms, and quantity surveyors who need real-time 3D models to present concepts to clients, win approvals faster, and eliminate rework.</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Architecture</span>
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Urban Planning</span>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left text-amber-500">⚓</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Port & Marine Industry</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">Port authorities, marine terminal developers, offshore facility planners, and shipyard developers who require large-scale 3D models integrating GIS data, utility grids, and environmental conditions.</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Ports</span>
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Terminals</span>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left text-amber-500">🏙️</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">City & Urban Development</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">Municipal authorities, smart city planners, urban bodies, and government agencies developing master plans, new towns, and infrastructure at city scale — needing community buy-in.</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Smart Cities</span>
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Master Plans</span>
              </div>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 shadow-sm hover:shadow-md hover:border-amber-300 transition-all group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform origin-left text-amber-500">🏨</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Property Owners & Investors</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">Individual property owners, REITs, family offices, and investors developing or repositioning assets — needing compelling visual tools to attract co-investors, tenants, or buyers.</p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">REITs</span>
                <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-xs font-semibold tracking-wide">Investors</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ PLATFORM 4 STAGES ══ */}
      <section className="bg-gray-50 py-20 border-b border-gray-200">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-3 text-xs font-bold tracking-widest uppercase text-amber-500 mb-4">
              The Platform
            </div>
            <h2 className="text-3xl sm:text-4xl font-sans font-bold text-dark-blue">One platform.<br /><span className="text-amber-500 italic">Four stages.</span><br />Zero confusion.</h2>
            <p className="mt-4 text-gray-600 max-w-2xl leading-relaxed">From concept sketch to live sales suite — a single, connected 3D workflow that eliminates fragmented tools, outdated plans, and costly miscommunication.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="rounded-3xl bg-white border border-gray-200 p-8 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500"></div>
              <div className="text-xs font-bold tracking-widest text-amber-500 mb-4 uppercase">STAGE 01</div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl mb-4">🛰️</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Rapid Prototype</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">With as little as a sketch and GPS coordinates, we build a full high-fidelity 3D model of your development in 72 hours. Satellite-scanned surroundings, sun-mapped lighting.</p>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500"></div>
              <div className="text-xs font-bold tracking-widest text-amber-500 mb-4 uppercase">STAGE 02</div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl mb-4">🔄</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Real-Time Adjustments</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">All stakeholders — developer, engineer, architect, planning authority — view the same live model and make changes in real time. Say goodbye to outdated 2D plans.</p>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500"></div>
              <div className="text-xs font-bold tracking-widest text-amber-500 mb-4 uppercase">STAGE 03</div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl mb-4">🔬</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Clarity for Construction</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">Peel away layers to reveal what&apos;s underneath — electrical conduits, water pipes, air vents, utility grids, GIS data, demographic insights, and municipal zoning.</p>
            </div>
            <div className="rounded-3xl bg-white border border-gray-200 p-8 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-amber-500"></div>
              <div className="text-xs font-bold tracking-widest text-amber-500 mb-4 uppercase">STAGE 04</div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-dark-blue mb-3 font-sans">Go to Market</h3>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">The planning tool becomes the sales platform. Integrated CRM, payment portal, virtual models, agent management, meeting tools, and guided buyer tours in one.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ COST SAVINGS ══ */}
      <section className="bg-white py-20 border-b border-gray-200">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            <div className="bg-gray-50 border border-gray-200 p-10 md:p-14 rounded-3xl relative shadow-sm">
              <div className="text-7xl sm:text-9xl font-sans font-bold leading-none mb-4 text-dark-blue">
                8<span className="text-amber-500">-</span><br />11<span className="text-amber-500">%</span>
              </div>
              <div className="text-xs tracking-widest uppercase text-gray-500 mb-10 font-bold">Average project cost savings</div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2 text-dark-blue"><span>Design oversight catch</span></div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-amber-500 h-full w-[90%] rounded-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2 text-dark-blue"><span>Render cost elimination</span></div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-amber-500 h-full w-[100%] rounded-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2 text-dark-blue"><span>Faster funding access</span></div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-amber-500 h-full w-[75%] rounded-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2 text-dark-blue"><span>Reduced marketing spend</span></div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-amber-500 h-full w-[85%] rounded-full"></div></div>
                </div>
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2 text-dark-blue"><span>Fewer variation orders</span></div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden"><div className="bg-amber-500 h-full w-[70%] rounded-full"></div></div>
                </div>
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-3 text-xs font-bold tracking-widest uppercase text-amber-500 mb-4">
                Why It Pays for Itself
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-sans font-bold mb-6 text-dark-blue">Every project saves<br />more than it <span className="text-amber-500 italic">costs.</span></h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-10">The platform pays for itself — and then some — by eliminating the hidden costs that bleed every development project. Average savings of 8–11% across the lifecycle.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                  <h4 className="font-bold text-dark-blue mb-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Design Oversights</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">Catch conflicts in 3D before site variations.</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                  <h4 className="font-bold text-dark-blue mb-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Render Costs Eliminated</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">The live 3D model IS the marketing material.</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                  <h4 className="font-bold text-dark-blue mb-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Faster Funding</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">Visualised prototype accelerates confidence.</p>
                </div>
                <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
                  <h4 className="font-bold text-dark-blue mb-2 text-sm flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Marketing Video Costs</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">Interactive 3D replaces physical show suites.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ PARTNERSHIP ══ */}
      <section className="bg-gray-50 py-20 border-b border-gray-200">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-50 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-50"></div>

            <div className="p-10 md:p-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <span className="bg-dark-blue text-white font-sans font-bold px-4 py-2 rounded-lg text-lg tracking-wide shadow">MillionFlats</span>
                  <span className="text-gray-400 font-mono font-bold">×</span>
                  <span className="bg-white border border-gray-200 text-dark-blue font-sans font-bold px-4 py-2 rounded-lg tracking-wide shadow-sm">Meta-dology</span>
                </div>
                <div className="text-xs font-bold tracking-widest uppercase text-amber-500 mb-4">Technology Partner</div>
                <h2 className="text-3xl sm:text-4xl font-sans font-bold text-dark-blue mb-6">Global Leaders in<br />3D Property Experiences</h2>
                <div className="space-y-4 text-gray-600 leading-relaxed text-sm lg:text-base">
                  <p>Meta-dology built the technology that powers what you see on this page. They are the world&apos;s foremost specialists in real-time 3D property and development environments — working with developers, builders, and infrastructure bodies across UAE, UK, South Africa, USA, and beyond.</p>
                  <p><strong>MillionFlats is their official Associate Partner.</strong> When you engage through MillionFlats, you get Meta-dology&apos;s full platform capability with a dedicated team that understands the Indian, South Asian, and Middle East development markets.</p>
                </div>
                <div className="mt-8 border-t border-gray-100 pt-6">
                  <p className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <strong className="text-dark-blue">Notice:</strong> The 3D world platform and AI tools are owned by Meta-dology. MillionFlats acts as Associate Partner, providing advisory for clients in India, UAE, and internationally.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-1">🛰️</div>
                  <div>
                    <h4 className="font-bold text-dark-blue text-sm mb-1 text-amber-600">Stage 1 — Rapid Prototype in 72h</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">Satellite scan, sun mapping, real views from every window — from sketch to full 3D model in 72 hours.</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-1">⚡</div>
                  <div>
                    <h4 className="font-bold text-dark-blue text-sm mb-1 text-amber-600">Stage 2 — Real-Time Stakeholder Alignment</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">Everyone on the same live model. Instant adjustments. No more fragmented PDFs and conflicting versions.</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-1">🔬</div>
                  <div>
                    <h4 className="font-bold text-dark-blue text-sm mb-1 text-amber-600">Stage 3 — Construction Clarity</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">X-ray layers revealing utilities, GIS data, municipal grids, and demographic insights — before you build.</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-1">🚀</div>
                  <div>
                    <h4 className="font-bold text-dark-blue text-sm mb-1 text-amber-600">Stage 4 — Integrated Sales Suite</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">CRM, payment portal, virtual tours, agent manager, lead management — a complete go-to-market platform.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="bg-white py-24 text-center">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-amber-500 mb-6">
            Get Started
          </div>
          <h2 className="text-4xl sm:text-5xl font-sans font-bold text-dark-blue leading-tight mb-6">
            Your project.<br />
            <span className="text-amber-500 italic">Visualised.</span> Approved. Sold.
          </h2>
          <p className="text-gray-600 text-lg leading-relaxed max-w-2xl mx-auto mb-10">Book a free demo and see your development come to life in 3D — or book a meeting with our team to discuss how this applies to your specific project.</p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/contact" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95 transition-all shadow-lg hover:-translate-y-0.5">
              Book a Free Demo
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center h-12 px-8 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50 transition-all shadow-sm">
              Book a Meeting
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-6 tracking-wide">No commitment · Worldwide · Delivered via video call</p>
        </div>
      </section>
    </div>
  )
}
