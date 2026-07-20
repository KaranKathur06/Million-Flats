import EcosystemCategoryPage from '@/components/ecosystem/EcosystemCategoryPage'

export default async function EcosystemCategoryLanding({ slug, page }: { slug: string; page?: number }) {
  return <EcosystemCategoryPage slug={slug} page={page} />
}
