import type { Metadata } from 'next'
import EcosystemCategoryLanding from '@/components/ecosystem/EcosystemCategoryLanding'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cfg = getEcosystemCategoryConfig(params.slug)
  if (!cfg) return {}

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

export default function EcosystemCategoryPage({ params }: { params: { slug: string } }) {
  return <EcosystemCategoryLanding slug={params.slug} />
}
