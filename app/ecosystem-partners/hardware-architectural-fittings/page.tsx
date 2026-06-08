import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('hardware-architectural-fittings')

type PageProps = { searchParams?: { page?: string } }

export default function HardwareArchitecturalFittingsPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="hardware-architectural-fittings" page={page} />
}
