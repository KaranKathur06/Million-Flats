'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import MatterportEmbed from '@/components/three-d-tour/MatterportEmbed'
import ThreeDTourInquiryWizard from '@/components/three-d-tour/ThreeDTourInquiryWizard'
import {
  DEMO_STATS,
  FAQ_ITEMS,
  PORTFOLIO_ITEMS,
  PRICING_TIERS,
  PROCESS_STEPS,
  SIDEBAR_BENEFITS,
  TESTIMONIALS,
  WHY_BUILDERS,
} from '@/lib/three-d-tour/demoLanding'
import { THREE_D_TOUR_EVENTS, trackThreeDTourEvent } from '@/lib/three-d-tour/trackDemo'

function StickyBenefitsSidebar() {
  return (
    <aside className="lg:sticky lg:top-24 rounded-2xl border border-slate-200 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-6 text-white shadow-xl">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300/90">Why MillionFlats</p>
      <h3 className="mt-2 text-xl font-extrabold">Enterprise-grade 3D delivery</h3>
      <ul className="mt-5 space-y-2.5">
        {SIDEBAR_BENEFITS.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-slate-200">
            <span className="mt-0.5 text-emerald-400">✓</span>
            {b}
          </li>
        ))}
      </ul>
      <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300">
        <p className="font-bold text-white">Deliverables include</p>
        <p className="mt-1 opacity-90">Matterport tour · Floor plans · HDR stills · Share links · Optional drone & video</p>
      </div>
    </aside>
  )
}

export default function ThreeDTourDemoLandingClient() {
  const wizardRef = useRef<HTMLDivElement>(null)
  const trackedAbandon = useRef(false)

  useEffect(() => {
    trackThreeDTourEvent(THREE_D_TOUR_EVENTS.PAGE_VISIT)
    const onLeave = () => {
      if (trackedAbandon.current) return
      trackedAbandon.current = true
      trackThreeDTourEvent(THREE_D_TOUR_EVENTS.FORM_ABANDONED, { reason: 'page_unload' })
    }
    window.addEventListener('beforeunload', onLeave)
    return () => window.removeEventListener('beforeunload', onLeave)
  }, [])

  const scrollToWizard = () => {
    wizardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0f2744] to-[#0a1628] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.15),transparent_50%)]" />
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-200">
              Premium consultation · MillionFlats × Meta-dology
            </p>
            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08]">
              Book Your Free{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
                3D Tour Consultation
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed max-w-xl">
              Tell us about your project and our team will prepare a tailored demo, pricing proposal, and
              implementation roadmap.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={scrollToWizard}
                className="inline-flex items-center justify-center h-14 px-8 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-[#0a1628] font-extrabold text-lg shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
              >
                Start Consultation
              </button>
              <Link
                href="/services/3d-tours#showcase"
                className="inline-flex items-center justify-center h-14 px-8 rounded-2xl border border-white/20 bg-white/5 font-bold text-lg hover:bg-white/10 transition-colors"
              >
                View Portfolio
              </Link>
            </div>
          </div>
          <MatterportEmbed className="aspect-[4/3] w-full" />
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1240px] px-4 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {DEMO_STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl sm:text-4xl font-extrabold text-dark-blue">{s.value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Why builders */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-dark-blue text-center">Why builders choose MillionFlats</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {WHY_BUILDERS.map((c) => (
              <div key={c.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-2xl">{c.icon}</span>
                <h3 className="mt-3 font-bold text-dark-blue">{c.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-extrabold text-dark-blue">Portfolio showcase</h2>
          <p className="mt-2 text-slate-600 max-w-2xl">Trust built before you submit — sample project categories we deliver worldwide.</p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PORTFOLIO_ITEMS.map((p) => (
              <div key={p.title} className="group relative rounded-2xl border border-slate-100 overflow-hidden min-h-[180px] shadow-sm hover:shadow-lg transition-shadow">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className={`absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent ${p.gradient}`} />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300/90">{p.tag}</span>
                  <p className="mt-1 font-extrabold text-white">{p.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16">
        <div className="mx-auto max-w-[1240px] px-4">
          <h2 className="text-3xl font-extrabold text-dark-blue text-center">Our 3D tour process</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {PROCESS_STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-slate-200 bg-white p-5">
                <span className="text-xs font-bold text-amber-600">{s.n}</span>
                <h3 className="mt-2 font-bold text-dark-blue">{s.title}</h3>
                <p className="mt-1 text-xs text-slate-600">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing preview */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="mx-auto max-w-[1240px] px-4">
          <h2 className="text-3xl font-extrabold text-center">Pricing preview</h2>
          <p className="text-center text-slate-400 mt-2 text-sm">Final quote after consultation — no obligation</p>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PRICING_TIERS.map((t) => (
              <div key={t.label} className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-xs uppercase tracking-wider text-slate-400">{t.note}</p>
                <p className="mt-2 text-2xl font-extrabold text-amber-300">{t.price}</p>
                <p className="mt-2 text-sm text-slate-300">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-[1240px] px-4 grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.author} className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
              <p className="text-sm text-slate-700 leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-4 text-xs font-bold text-dark-blue">{t.author}</footer>
              <p className="text-[11px] text-slate-500">{t.role}</p>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Wizard section */}
      <section ref={wizardRef} id="consultation-form" className="py-16 lg:py-24 scroll-mt-20">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-dark-blue">Start your project consultation</h2>
            <p className="mt-3 text-slate-600">Complete the steps below — progress saves automatically when you&apos;re signed in.</p>
          </div>
          <div className="grid lg:grid-cols-[minmax(280px,360px)_1fr] gap-8 items-start">
            <StickyBenefitsSidebar />
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-visible">
              <ThreeDTourInquiryWizard
                variant="page"
                onCancel={() => {
                  window.location.href = '/services/3d-tours'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-[800px] px-4">
          <h2 className="text-2xl font-extrabold text-dark-blue text-center mb-8">Frequently asked questions</h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((f) => (
              <details key={f.q} className="group rounded-xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer font-bold text-dark-blue list-none flex justify-between gap-4">
                  {f.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
