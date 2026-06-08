import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('home-loans-finance')

type PageProps = { searchParams?: { page?: string } }

export default function HomeLoansFinancePage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="home-loans-finance" page={page} />
}
