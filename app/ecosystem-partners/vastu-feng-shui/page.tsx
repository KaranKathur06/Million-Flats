import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('vastu-feng-shui')

export { generateMetadata }
export default function VastuFengShuiWrapper(props: { searchParams?: { page?: string } }) {
  return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
