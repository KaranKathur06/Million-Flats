import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MANUAL_PROPERTY_PUBLIC_STATUS } from '@/lib/manualPropertyLifecycle'
import { buildManualPropertyPath, parseManualPropertySlug } from '@/lib/manualPropertyRoutes'

export default async function LegacyPropertyDetailPage({ params }: { params: { id: string } }) {
  const id = parseManualPropertySlug(String(params?.id || ''))
  if (!id) notFound()

  const property = await (prisma as any).manualProperty.findFirst({
    where: {
      id,
      status: MANUAL_PROPERTY_PUBLIC_STATUS,
      sourceType: 'MANUAL',
      agent: {
        approved: true,
        profileStatus: 'LIVE',
        user: { status: 'ACTIVE' },
      },
    },
    select: { id: true, title: true, intent: true },
  })

  if (!property) notFound()

  redirect(buildManualPropertyPath({ id: property.id, title: property.title, intent: property.intent }))
}
