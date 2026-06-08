import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('property-management')

type PageProps = { searchParams?: { page?: string } }

export default function PropertyManagementPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="property-management" page={page} />
}
