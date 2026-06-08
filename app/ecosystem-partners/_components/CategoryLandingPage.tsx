import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EcosystemCategoryLanding from '@/components/ecosystem/EcosystemCategoryLanding'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'
import type { EcosystemCategorySlug } from '@/lib/ecosystemPartners'

export function categoryLandingMetadata(slug: EcosystemCategorySlug): Metadata {
  const cfg = getEcosystemCategoryConfig(slug)
  if (!cfg) return { title: 'Ecosystem Partners | MillionFlats' }
  return {
    title: cfg.meta.title,
    description: cfg.meta.description,
    openGraph: {
      title: cfg.meta.title,
      description: cfg.meta.description,
      images: cfg.meta.ogImage ? [{ url: cfg.meta.ogImage }] : undefined,
    },
  }
}

export default function CategoryLandingPage({
  slug,
  page,
}: {
  slug: EcosystemCategorySlug
  page?: number
}) {
  const cfg = getEcosystemCategoryConfig(slug)
  if (!cfg) notFound()
  return <EcosystemCategoryLanding slug={slug} page={page} />
}
