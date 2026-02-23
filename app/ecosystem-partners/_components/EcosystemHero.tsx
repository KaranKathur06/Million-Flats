 'use client'

import InternalPageBanner from '@/components/InternalPageBanner'
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
    <InternalPageBanner
      title={headline}
      description={subheadline}
      image={{ src, alt: imageAlt }}
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Ecosystem', href: '/ecosystem-partners' },
      ]}
      ctas={[
        {
          label: ctaLabel,
          href: ctaHref,
          variant: 'primary',
          onClick: () => trackEvent('ecosystem_hero_cta_click', { label: ctaLabel, href: ctaHref }),
        },
      ]}
    />
  )
}
