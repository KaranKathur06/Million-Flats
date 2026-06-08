import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('smart-home-automation')

type PageProps = { searchParams?: { page?: string } }

export default function SmartHomeAutomationPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="smart-home-automation" page={page} />
}
