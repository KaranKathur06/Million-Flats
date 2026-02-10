'use client'

import Image from 'next/image'
import Link from 'next/link'

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
  return (
    <section className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue">{headline}</h1>
            <p className="mt-4 text-lg text-gray-600">{subheadline}</p>
            <div className="mt-6">
              <Link
                href={ctaHref}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90"
              >
                {ctaLabel}
              </Link>
            </div>
          </div>

          <div className="relative w-full overflow-hidden rounded-3xl border border-gray-200 bg-gray-50">
            <div className="relative aspect-[16/10] w-full">
              <Image src={imageSrc} alt={imageAlt} fill className="object-cover" sizes="(min-width: 1024px) 560px, 100vw" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
