import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('property-management')

export { generateMetadata }
export default CategoryPage
export const dynamic = 'force-dynamic'
export const revalidate = 0
