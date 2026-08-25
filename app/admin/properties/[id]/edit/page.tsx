import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PropertyDetailsEditor } from '@/components/admin/properties/PropertyDetailsEditor'
import { PropertyMediaManager } from '@/components/admin/properties/PropertyMediaManager'

export default async function AdminPropertyEditPage({ params }: { params: { id: string } }) {
  const property = await (prisma as any).manualProperty.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      propertyType: true,
      intent: true,
      price: true,
      currency: true,
      constructionStatus: true,
      shortDescription: true,
      bedrooms: true,
      bathrooms: true,
      squareFeet: true,
      countryIso2: true,
      city: true,
      community: true,
      address: true,
      developerName: true,
      latitude: true,
      longitude: true,
      paymentPlanText: true,
      paymentPlan: true,
      emiNote: true,
      tour3dUrl: true,
      status: true,
      _count: { select: { media: true } },
    },
  })

  if (!property) notFound()

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/properties" className="text-sm text-white/45 hover:text-white/70">Back to Properties</Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">{property.title || 'Untitled property'}</h1>
        <p className="mt-1 text-sm text-white/45">{[property.community, property.city].filter(Boolean).join(', ') || 'Location pending'} - {property._count.media} media items</p>
      </div>
      <PropertyDetailsEditor property={property} />
      <PropertyMediaManager propertyId={property.id} />
    </div>
  )
}
