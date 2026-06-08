import CategoryLandingPage, { categoryLandingMetadata } from '../_components/CategoryLandingPage'

export const metadata = categoryLandingMetadata('legal-documentation')

type PageProps = { searchParams?: { page?: string } }

export default function LegalDocumentationPage({ searchParams }: PageProps) {
  const page = Number(searchParams?.page || '1')
  return <CategoryLandingPage slug="legal-documentation" page={page} />
}
