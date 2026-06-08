import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('property-insurance')

export { generateMetadata }
export default CategoryPage
export const dynamic = 'force-dynamic'
export const revalidate = 0
