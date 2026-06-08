import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('packers-movers')

type PageProps = { searchParams?: { page?: string } }

export default function PackersMoversPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="packers-movers" page={page} />
}
