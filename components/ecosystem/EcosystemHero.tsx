 'use client'

import InternalPageBanner from '@/components/InternalPageBanner'
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
    <InternalPageBanner
      title={title}
      description={subtitle}
      image={image}
      breadcrumb={[
        { label: 'Home', href: '/' },
        { label: 'Ecosystem', href: '/ecosystem-partners' },
      ]}
      ctas={[
        {
          label: primaryCta.label,
          href: primaryCta.href,
          variant: 'primary',
          onClick: () =>
            trackEvent('ecosystem_hero_cta_click', { type: 'primary', label: primaryCta.label, href: primaryCta.href }),
        },
        {
          label: secondaryCta.label,
          href: secondaryCta.href,
          variant: 'secondary',
          onClick: () =>
            trackEvent('ecosystem_hero_cta_click', { type: 'secondary', label: secondaryCta.label, href: secondaryCta.href }),
        },
      ]}
    />
  )
}
