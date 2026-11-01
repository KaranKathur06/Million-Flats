import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { page?: string }
}) {
  const { generateMetadata: gen } = createEcosystemCategoryPage(params.slug)
  return gen({ searchParams })
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EcosystemCategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: { page?: string }
}) {
  const { CategoryPage } = createEcosystemCategoryPage(params.slug)
  return <CategoryPage searchParams={searchParams} />
}
