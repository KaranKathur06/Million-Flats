import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('interior-design-renovation')

export { generateMetadata }
export default function InteriorDesignRenovationWrapper(props: { searchParams?: { page?: string } }) {
  return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
