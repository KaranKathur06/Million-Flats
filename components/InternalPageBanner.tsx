'use client'

import Image from 'next/image'
import Link from 'next/link'

type BreadcrumbItem = {
  label: string
  href: string
}

type BannerCta = {
  label: string
  href: string
  variant: 'primary' | 'secondary'
  onClick?: () => void
}

export default function InternalPageBanner({
  title,
  description,
  image,
  breadcrumb,
  ctas,
}: {
  title: string
  description?: string
  image?: { src: string; alt: string }
  breadcrumb?: BreadcrumbItem[]
  ctas?: BannerCta[]
}) {
  const imgSrc = String(image?.src || '').trim()

  return (
    <section className="bg-white border-b border-gray-200">
      <div className="relative w-full min-h-[220px] sm:min-h-[260px] lg:min-h-[320px] overflow-hidden">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={image?.alt || title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1920px"
            priority
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(15,25,40,0.75)] via-[rgba(15,25,40,0.62)] to-[rgba(15,25,40,0.52)]" />

        <div className="absolute inset-0">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
            <div className="w-full" style={{ paddingTop: 60, paddingBottom: 60 }}>
              <div className="max-w-[650px] text-white">
                {breadcrumb && breadcrumb.length ? (
                  <nav className="text-xs sm:text-sm text-white/80">
                    {breadcrumb.map((b, idx) => (
                      <span key={`${b.href}-${idx}`}>
                        <Link href={b.href} className="hover:text-white">
                          {b.label}
                        </Link>
                        {idx < breadcrumb.length - 1 ? <span className="mx-2">/</span> : null}
                      </span>
                    ))}
                  </nav>
                ) : null}

                <h1 className="mt-4 text-[42px] md:text-[48px] font-serif font-bold tracking-tight">{title}</h1>
                {description ? <p className="mt-4 text-base md:text-lg text-white/90">{description}</p> : null}

                {ctas && ctas.length ? (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {ctas.map((c) => {
                      const cls =
                        c.variant === 'primary'
                          ? 'inline-flex h-11 items-center justify-center rounded-xl bg-white px-6 font-semibold text-dark-blue hover:bg-white/95'
                          : 'inline-flex h-11 items-center justify-center rounded-xl border border-white/35 bg-white/10 px-6 font-semibold text-white hover:bg-white/15'

                      return (
                        <Link key={`${c.href}-${c.label}`} href={c.href} onClick={c.onClick} className={cls}>
                          {c.label}
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
