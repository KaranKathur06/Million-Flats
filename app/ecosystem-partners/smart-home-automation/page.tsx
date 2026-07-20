import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('smart-home-automation')

export { generateMetadata }
export default function SmartHomeAutomationWrapper(props: { searchParams?: { page?: string } }) {
	return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
