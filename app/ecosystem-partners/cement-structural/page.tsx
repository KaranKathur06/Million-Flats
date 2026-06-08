import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('cement-structural')

type PageProps = { searchParams?: { page?: string } }

export default function CementStructuralPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="cement-structural" page={page} />
}
