import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('cement-structural')

export { generateMetadata }
export default function CementStructuralWrapper(props: { searchParams?: { page?: string } }) {
	return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
