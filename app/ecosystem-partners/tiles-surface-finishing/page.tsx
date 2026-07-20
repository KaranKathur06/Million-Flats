import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('tiles-surface-finishing')

export { generateMetadata }
export default function TilesSurfaceFinishingWrapper(props: { searchParams?: { page?: string } }) {
	return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
