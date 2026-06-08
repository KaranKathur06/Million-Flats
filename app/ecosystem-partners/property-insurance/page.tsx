import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('property-insurance')

type PageProps = { searchParams?: { page?: string } }

export default function PropertyInsurancePage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="property-insurance" page={page} />
}
