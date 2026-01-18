import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { parseIdFromSlug } from '@/lib/seo'
import PropertyDetailPage, { generateMetadata as generateMetadataById } from '@/app/properties/[id]/page'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const id = parseIdFromSlug(params?.slug)
  if (!id) return { title: 'Property' }
  return generateMetadataById({ params: { id } } as any)
}

export default async function BuyProjectSeoPage({
  params,
}: {
  params: { region: string; district: string; sector: string; slug: string }
}) {
  const id = parseIdFromSlug(params?.slug)
  if (!id) notFound()
  return <PropertyDetailPage params={{ id }} />
}
