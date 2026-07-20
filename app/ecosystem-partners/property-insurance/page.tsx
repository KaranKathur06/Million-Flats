import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('property-insurance')

export { generateMetadata }
export default function PropertyInsuranceWrapper(props: { searchParams?: { page?: string } }) {
  return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
