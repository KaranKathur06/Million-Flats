import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('vastu-feng-shui')

type PageProps = { searchParams?: { page?: string } }

export default function VastuFengShuiPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="vastu-feng-shui" page={page} />
}
