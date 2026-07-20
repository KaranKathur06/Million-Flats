import { createEcosystemCategoryPage } from '@/lib/ecosystem/categoryPage'

const { generateMetadata, CategoryPage } = createEcosystemCategoryPage('technology-partners')

export { generateMetadata }
export default function TechnologyPartnersWrapper(props: { searchParams?: { page?: string } }) {
  return <CategoryPage searchParams={props.searchParams} />
}
export const dynamic = 'force-dynamic'
export const revalidate = 0
