import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('property-management')

export { generateMetadata }
export default function PropertyManagementWrapper(props: { searchParams?: { page?: string } }) {
  return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
