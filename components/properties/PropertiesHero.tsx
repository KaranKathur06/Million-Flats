import Link from 'next/link'
import type { ReactNode } from 'react'
import HeroBannerBackdrop from '@/components/HeroBannerBackdrop'
import type { ResolvedHeroBanner } from '@/lib/heroBanners'

export default function PropertiesHero({ title, subtitle, breadcrumb, image, search, banner }: { title: string; subtitle: string; breadcrumb?: { label: string; href: string }[]; image?: { src: string; alt: string }; search?: ReactNode; banner?: ResolvedHeroBanner }) {
  const heroTitle = banner?.headline || title
  const heroSubtitle = banner?.subheadline || subtitle
  return (
    <section className="relative overflow-hidden bg-[#0c1d37] text-white">
      <div className="absolute inset-0 opacity-25">
        <HeroBannerBackdrop
          desktopImage={banner?.desktopImage || image?.src || '/HOMEPAGE.jpeg'}
          mobileImage={banner?.mobileImage}
          desktopAlt={banner?.desktopAlt || image?.alt || heroTitle}
          mobileAlt={banner?.mobileAlt || image?.alt || heroTitle}
          fallbackImage="/HOMEPAGE.jpeg"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(47,78,112,0.55),transparent_55%),linear-gradient(115deg,rgba(8,22,42,0.98),rgba(13,34,61,0.84))]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-12 text-center sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
        {breadcrumb?.length ? (
          <nav className="mb-8 text-sm text-white/65" aria-label="Breadcrumb">
            {breadcrumb.map((item: any, index: number) => (
              <span key={item.href}>
                <Link href={item.href} className="hover:text-white">{item.label}</Link>
                {index < breadcrumb.length - 1 ? <span className="mx-2">/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-yellow">Property Discovery</p>
        <h1 className="mx-auto mt-5 max-w-3xl font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{heroTitle}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">{heroSubtitle}</p>
        {search ? <div className="relative z-20 mx-auto mt-8 w-full max-w-3xl text-left">{search}</div> : null}
      </div>
    </section>
  )
}
