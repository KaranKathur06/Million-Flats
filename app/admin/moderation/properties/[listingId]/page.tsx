import { notFound, redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ManualPropertyPreview from '@/components/ManualPropertyPreview'
import ModerationPanelClient from './ModerationPanelClient'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export default async function AdminModerationReviewPage({ params }: { params: { listingId: string } }) {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fmoderation%2Fproperties')
  }

  if (role !== 'ADMIN') {
    redirect('/user/dashboard?error=admin_only')
  }

  const id = safeString(params?.listingId)
  if (!id) notFound()

  const property = await (prisma as any).manualProperty
    .findFirst({
      where: { id, sourceType: 'MANUAL' },
      include: {
        media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] },
        agent: { include: { user: true } },
      },
    })
    .catch(() => null)

  if (!property) notFound()

  const hasCover = Array.isArray(property?.media)
    ? property.media.some((m: any) => String(m?.category) === 'COVER' && safeString(m?.url))
    : false

  const lat = safeNumber(property?.latitude)
  const lng = safeNumber(property?.longitude)
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)

  const hasPrice = typeof property?.price === 'number' && property.price > 0
  const hasDescription = safeString(property?.shortDescription).length >= 40

  const amenityCount =
    (Array.isArray(property?.amenities) ? property.amenities.length : 0) +
    (Array.isArray(property?.customAmenities) ? property.customAmenities.length : 0)

  const checklist = {
    hasCover,
    hasCoords,
    hasPrice,
    hasDescription,
    amenityCount,
  }

  const agentUser = property?.agent?.user
  const agentName = safeString(agentUser?.name) || safeString(agentUser?.email) || 'Agent'

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <ManualPropertyPreview manual={property} />
          </div>

          <div>
            <ModerationPanelClient
              listingId={String(property.id)}
              status={String(property.status || '')}
              agentName={agentName}
              agentCompany={safeString(property?.agent?.company)}
              agentEmail={safeString(agentUser?.email)}
              agentPhone={safeString(agentUser?.phone)}
              agentWhatsapp={safeString(property?.agent?.whatsapp)}
              agentId={safeString(property?.agentId)}
              checklist={checklist}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
