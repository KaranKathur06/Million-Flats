'use client'

import Image from 'next/image'
import Link from 'next/link'
import { trackEvent } from '@/lib/analytics'

export default function EcosystemHero({
  title,
  subtitle,
  image,
  primaryCta,
  secondaryCta,
}: {
  title: string
  subtitle: string
  image: { src: string; alt: string }
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
}) {
  return (
    <section className="bg-white border-b border-gray-200">
      <div className="relative w-full aspect-[16/7] overflow-hidden">
        <Image
          src={image.src}
          alt={image.alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 1920px"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/35 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />

        <div className="absolute inset-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end">
            <div className="pb-10 md:pb-12 max-w-3xl text-white">
              <nav className="text-xs sm:text-sm text-white/80">
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
                <span className="mx-2">/</span>
                <Link href="/ecosystem-partners" className="hover:text-white">
                  Ecosystem
                </Link>
              </nav>

              <h1 className="mt-4 text-4xl md:text-5xl font-serif font-bold tracking-tight">{title}</h1>
              <p className="mt-4 text-base md:text-lg text-white/90">{subtitle}</p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={primaryCta.href}
                  onClick={() => trackEvent('ecosystem_hero_cta_click', { type: 'primary', label: primaryCta.label, href: primaryCta.href })}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 font-semibold text-dark-blue hover:bg-white/95"
                >
                  {primaryCta.label}
                </Link>
                <Link
                  href={secondaryCta.href}
                  onClick={() =>
                    trackEvent('ecosystem_hero_cta_click', { type: 'secondary', label: secondaryCta.label, href: secondaryCta.href })
                  }
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-white/35 bg-white/10 px-6 font-semibold text-white hover:bg-white/15"
                >
                  {secondaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
