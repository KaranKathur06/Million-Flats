import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('hardware-architectural-fittings')

export { generateMetadata }
export default function HardwareArchitecturalFittingsWrapper(props: { searchParams?: { page?: string } }) {
	return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
