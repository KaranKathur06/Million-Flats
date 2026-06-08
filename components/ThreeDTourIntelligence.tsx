'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ─────────────────────────────────────────────────────────
   TYPES & DATA
   ───────────────────────────────────────────────────────── */

interface TourCard {
  id: string
  headline: string
  sub: string
  body: string
  cta: string
  href: string
  icon: React.ReactNode
  accentFrom: string
  accentTo: string
  glowColor: string
  trackEvent: string
  tags?: string[]
}

const TOUR_CARDS: TourCard[] = [
  {
    id: 'offplan',
    headline: '3D Tour',
    sub: 'Visualize the unbuilt with mathematical precision.',
    body: 'We transform architectural CAD files and material schedules into hyper-realistic, fully navigable digital twins. Experience true-to-life lighting, accurate panoramic views, and exact spatial dimensions before the foundation is even poured.',
    cta: 'Explore Off-Plan Tours',
    href: '/services/3d-tours?type=offplan',
    trackEvent: 'offplan_click',
    accentFrom: '#3b82f6',
    accentTo: '#60a5fa',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    tags: ['CAD-to-3D', 'Digital Twin', 'Pre-Construction'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" />
        <path d="M5 21V7l8-4v18" />
        <path d="M19 21V11l-6-4" />
        <path d="M9 9v.01" />
        <path d="M9 12v.01" />
        <path d="M9 15v.01" />
        <path d="M9 18v.01" />
      </svg>
    ),
  },
  {
    id: 'lidar',
    headline: 'LiDAR Capture',
    sub: 'Millimeter-accurate scanning for existing assets.',
    body: 'We deploy enterprise-grade LiDAR laser scanning to create flawless, measurable 3D meshes of physical spaces, ensuring absolute dimensional accuracy with zero distortion.',
    cta: 'View LiDAR Scans',
    href: '/services/3d-tours?type=lidar',
    trackEvent: 'lidar_click',
    accentFrom: '#10b981',
    accentTo: '#34d399',
    glowColor: 'rgba(16, 185, 129, 0.15)',
    tags: ['LiDAR', 'Point Cloud', 'As-Built'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4" />
        <path d="M12 19v4" />
        <path d="M1 12h4" />
        <path d="M19 12h4" />
        <path d="M4.22 4.22l2.83 2.83" />
        <path d="M16.95 16.95l2.83 2.83" />
        <path d="M4.22 19.78l2.83-2.83" />
        <path d="M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    id: 'ai-intelligence',
    headline: 'AI Intelligence',
    sub: 'Interactive due diligence embedded in 3D.',
    body: 'Embed real-world data into digital twins. Instantly verify materials, legal title, and ROI forecasts powered by AI - AIView for authenticity, AIShield for pricing, and AIIndex for ROI.',
    cta: 'See AI in Action',
    href: '/ai/view',
    trackEvent: 'ai_click',
    accentFrom: '#f59e0b',
    accentTo: '#fbbf24',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    tags: ['AIView', 'AIShield', 'AIIndex'],
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
]

/* ─────────────────────────────────────────────────────────
   GA4 TRACKING HELPER
   ───────────────────────────────────────────────────────── */

function trackGA4Event(eventName: string, params?: Record<string, string>) {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    ; (window as any).gtag('event', eventName, {
      event_category: '3d_tour_intelligence',
      event_label: eventName,
      ...params,
    })
  }
}

/* ─────────────────────────────────────────────────────────
   INTERSECTION OBSERVER HOOK
   ───────────────────────────────────────────────────────── */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          obs.unobserve(el)
        }
      },
      { threshold }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, isVisible }
}

/* ─────────────────────────────────────────────────────────
   (Demo modal removed — only 3 cards now)
   ───────────────────────────────────────────────────────── */

/* ─────────────────────────────────────────────────────────
   FEATURE CARD COMPONENT
   ───────────────────────────────────────────────────────── */

function FeatureCard({
  card,
  index,
  isVisible,
}: {
  card: TourCard
  index: number
  isVisible: boolean
}) {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = () => {
    trackGA4Event(card.trackEvent, { card_position: String(index + 1) })
  }

  return (
    <div
      className="group relative rounded-[1.25rem] overflow-hidden transition-all duration-500 cursor-pointer"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
        transitionDelay: `${index * 120}ms`,
        willChange: 'transform, opacity',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* ── Card border glow ── */}
      <div
        className="absolute -inset-[1px] rounded-[1.25rem] transition-opacity duration-500 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${card.accentFrom}40, transparent 40%, transparent 60%, ${card.accentTo}30)`,
          opacity: isHovered ? 1 : 0.3,
        }}
      />

      {/* ── Card body ── */}
      <div
        className="relative h-full rounded-[1.25rem] p-6 sm:p-7 flex flex-col transition-all duration-500"
        style={{
          background: isHovered
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(255,255,255,0.025)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          boxShadow: isHovered
            ? `0 25px 60px rgba(0,0,0,0.3), 0 0 80px ${card.glowColor}`
            : '0 4px 20px rgba(0,0,0,0.15)',
        }}
      >
        {/* ── Icon ── */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500"
          style={{
            background: `linear-gradient(135deg, ${card.accentFrom}18, ${card.accentTo}10)`,
            border: `1px solid ${card.accentFrom}25`,
            color: card.accentFrom,
            transform: isHovered ? 'scale(1.1) rotate(-3deg)' : 'scale(1)',
            boxShadow: isHovered ? `0 0 30px ${card.glowColor}` : 'none',
          }}
        >
          {card.icon}
        </div>

        {/* ── Headline ── */}
        <h3
          className="text-[1.1rem] sm:text-[1.2rem] font-bold text-white mb-2 leading-tight tracking-tight transition-colors duration-300"
          style={{ color: isHovered ? card.accentTo : '#ffffff' }}
        >
          {card.headline}
        </h3>

        {/* ── Subtitle ── */}
        <p className="text-white/50 text-sm font-medium mb-3 leading-snug">
          {card.sub}
        </p>

        {/* ── Body text ── */}
        <p className="text-white/35 text-[13px] leading-relaxed mb-5 flex-1">
          {card.body}
        </p>

        {/* ── Tags ── */}
        {card.tags && (
          <div className="flex flex-wrap gap-2 mb-5">
            {card.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all duration-300"
                style={{
                  background: `${card.accentFrom}10`,
                  border: `1px solid ${card.accentFrom}20`,
                  color: `${card.accentFrom}cc`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── CTA ── */}
        <Link
          href={card.href}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-bold transition-all duration-300 mt-auto"
          style={{
            background: isHovered
              ? `linear-gradient(135deg, ${card.accentFrom}, ${card.accentTo})`
              : `${card.accentFrom}15`,
            color: isHovered ? '#fff' : card.accentFrom,
            border: `1px solid ${card.accentFrom}${isHovered ? '60' : '25'}`,
          }}
        >
          {card.cta}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────
   MAIN SECTION COMPONENT
   ───────────────────────────────────────────────────────── */

export default function ThreeDTourIntelligence() {
  const { ref: sectionRef, isVisible } = useInView(0.08)

  // Track section visibility for analytics
  useEffect(() => {
    if (isVisible) {
      trackGA4Event('3d_tour_section_viewed')
    }
  }, [isVisible])

  return (
    <>
      <section
        ref={sectionRef}
        id="3d-tour-intelligence"
        className="relative w-full overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #0d1f38 0%, #091428 35%, #0a1a30 70%, #0d1f38 100%)',
        }}
      >
        {/* ── Ambient background effects ── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          {/* Floating orb 1 — amber */}
          <div
            className="absolute w-[500px] h-[500px] rounded-full blur-[160px] opacity-[0.06]"
            style={{
              background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
              top: '10%',
              left: '15%',
              animation: 'float-orb 20s ease-in-out infinite',
            }}
          />
          {/* Floating orb 2 — blue */}
          <div
            className="absolute w-[400px] h-[400px] rounded-full blur-[140px] opacity-[0.05]"
            style={{
              background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
              bottom: '5%',
              right: '10%',
              animation: 'float-orb 25s ease-in-out infinite reverse',
            }}
          />
          {/* Floating orb 3 — emerald */}
          <div
            className="absolute w-[300px] h-[300px] rounded-full blur-[120px] opacity-[0.04]"
            style={{
              background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
              top: '60%',
              left: '50%',
              animation: 'float-orb 18s ease-in-out infinite',
            }}
          />
        </div>

        {/* ── Divider line at top ── */}
        <div className="relative w-full">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          {/* ── Section Header ── */}
          <div
            className="text-center mb-16 sm:mb-20 transition-all duration-700"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            }}
          >
            {/* Micro-tag */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-amber-500/[0.08] border border-amber-500/15 mb-7 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400/80 text-[10px] font-bold tracking-[0.2em] uppercase">
                Powered by AI™ + LiDAR + Digital Twin Technology
              </span>
            </div>

            {/* Title */}
            <h2 className="text-3xl sm:text-4xl md:text-[2.75rem] lg:text-5xl font-serif font-bold text-white tracking-tight leading-[1.1] mb-5">
              Experience Properties{' '}
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #ef4444 100%)',
                }}
              >
                Beyond Reality
              </span>
            </h2>

            {/* Subtitle */}
            <p className="text-white/45 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-medium">
              From unbuilt concepts to real-world assets, MillionFlats delivers precision-driven 3D intelligence powered by AI™.
            </p>
          </div>

          {/* ── 3 Feature Cards Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {TOUR_CARDS.map((card, i) => (
              <FeatureCard
                key={card.id}
                card={card}
                index={i}
                isVisible={isVisible}
              />
            ))}
          </div>

          {/* ── Bottom CTA Strip ── */}
          <div
            className="mt-16 sm:mt-20 text-center transition-all duration-700"
            style={{
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
              transitionDelay: '600ms',
            }}
          >
            {/* Stats / social proof bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mb-8">
              {[
                /*{ value: '500+', label: 'Tours Delivered' },*/
                { value: '99.7%', label: 'Accuracy Rate' },
                { value: '<48h', label: 'Delivery Time' },
                { value: '31%', label: 'Faster Sales' },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-2">
                  <span className="text-white font-bold text-lg sm:text-xl tracking-tight">{stat.value}</span>
                  <span className="text-white/30 text-xs sm:text-sm font-medium uppercase tracking-wider">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <div className="flex items-center justify-center">
              <Link
                href="/services/3d-tours"
                className="group inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-bold transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                  color: '#0d1f38',
                  boxShadow: '0 4px 20px rgba(245, 158, 11, 0.25)',
                }}
                onClick={() => trackGA4Event('3d_tour_cta_explore')}
              >
                Explore 3D Tour Platform
                <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
            </div>

            {/* Trust micro-copy */}
            <p className="mt-6 text-white/20 text-xs font-medium tracking-wide">
              Trusted by 100+ developers, agencies, and wealth managers across 12 countries
            </p>
          </div>
        </div>

        {/* ── Divider line at bottom ── */}
        <div className="relative w-full">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </section>

      {/* ── Mobile Sticky CTA (only visible on small screens) ── */}
      <div
        className="mf-sticky-mobile-cta sm:hidden transition-all duration-500 pointer-events-none"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <div
          className="pointer-events-auto flex items-center gap-3 px-4 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(13,31,56,0.95) 30%)',
          }}
        >
          <Link
            href="/services/3d-tours"
            className="mf-touch-target flex flex-1 items-center justify-center min-h-12 rounded-xl text-sm font-bold"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#0d1f38',
            }}
          >
            Explore 3D Tours
          </Link>
        </div>
      </div>

      {/* ── Keyframe animations (injected once) ── */}
      <style jsx global>{`
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(30px, -20px); }
          50% { transform: translate(-15px, 15px); }
          75% { transform: translate(20px, 10px); }
        }
      `}</style>
    </>
  )
}
