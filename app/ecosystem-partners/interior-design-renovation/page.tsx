import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('interior-design-renovation')

type PageProps = { searchParams?: { page?: string } }

export default function InteriorDesignRenovationPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="interior-design-renovation" page={page} />
}
