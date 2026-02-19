'use client'

import Image from 'next/image'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

export default function EcosystemHero({
  headline,
  subheadline,
  ctaLabel,
  ctaHref,
  imageSrc,
  imageAlt,
}: {
  headline: string
  subheadline: string
  ctaLabel: string
  ctaHref: string
  imageSrc: string
  imageAlt: string
}) {
  const src = String(imageSrc || '').trim() || '/LOGO.jpeg'
  return (
    <section className="bg-white border-b border-gray-200">
      <div className="relative w-full aspect-[16/10] overflow-hidden">
        <Image src={src} alt={imageAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 1920px" />
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

        <div className="absolute inset-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="max-w-2xl text-white">
              <nav className="text-xs sm:text-sm text-white/80">
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
                <span className="mx-2">/</span>
                <Link href="/ecosystem-partners" className="hover:text-white">
                  Ecosystem
                </Link>
              </nav>

              <h1 className="mt-4 text-4xl md:text-5xl font-serif font-bold tracking-tight">{headline}</h1>
              <p className="mt-4 text-base md:text-lg text-white/90">{subheadline}</p>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <Link
                  href={ctaHref}
                  onClick={() => trackEvent('ecosystem_hero_cta_click', { label: ctaLabel, href: ctaHref })}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 font-semibold text-dark-blue hover:bg-white/95"
                >
                  {ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
