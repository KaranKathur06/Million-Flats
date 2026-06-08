import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('tiles-surface-finishing')

type PageProps = { searchParams?: { page?: string } }

export default function TilesSurfaceFinishingPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="tiles-surface-finishing" page={page} />
}
