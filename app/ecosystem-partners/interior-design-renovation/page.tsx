import EcosystemCategoryLanding from '@/components/ecosystem/EcosystemCategoryLanding'
import type { Metadata } from 'next'
import { getEcosystemCategoryConfig } from '@/lib/ecosystem/categoryConfig'

export async function generateMetadata(): Promise<Metadata> {
  const cfg = getEcosystemCategoryConfig('interior-design-renovation')
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

export default function InteriorDesignRenovationPage() {
  return <EcosystemCategoryLanding slug="interior-design-renovation" />
}
