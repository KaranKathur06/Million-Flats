import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AgentDashboardClient from './AgentDashboardClient'
import { resolveAgentStatus } from '@/lib/agentLifecycle'
import { buildAssetUrl } from '@/lib/assetUrl'
import { calculateManualListingQuality } from '@/lib/manualPropertyForm'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function formatRelativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime()
  const min = Math.max(0, Math.floor(diffMs / 60000))
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function computeDraftCompletion(d: any) {
  return calculateManualListingQuality({
    title: d?.title,
    category: d?.category,
    propertyType: d?.propertyType,
    intent: d?.intent,
    price: d?.price,
    squareFeet: d?.squareFeet,
    bedrooms: d?.bedrooms,
    bathrooms: d?.bathrooms,
    city: d?.city,
    community: d?.community,
    latitude: d?.latitude,
    longitude: d?.longitude,
    shortDescription: d?.shortDescription,
    media: d?.media,
    amenities: Array.isArray(d?.amenities) ? d.amenities : [],
  }).score
}

function mediaAssetUrl(media: any) {
  const source = String(media?.s3Key || media?.url || '').trim()
  return source ? buildAssetUrl(source) || source : ''
}

export default async function AgentDashboardPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/auth?tab=login&next=%2Fagent-portal')
  }

  if (role !== 'AGENT') {
    redirect(getHomeRouteForRole(role))
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    redirect('/agent/auth?tab=login&next=%2Fagent-portal')
  }

  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!dbUser || !dbUser.agent) {
    redirect('/agent/auth?tab=login&next=%2Fagent-portal')
  }

  const agent = dbUser.agent
  const agentStatus = resolveAgentStatus({
    status: agent.status,
    approved: agent.approved,
    profileStatus: agent.profileStatus,
    verificationStatus: agent.verificationStatus,
  })

  const agentRow = await (prisma as any).agent
    .findUnique({
      where: { id: agent.id },
      select: { id: true, profilePhoto: true, profileImageUrl: true, license: true, whatsapp: true, bio: true, profileStatus: true, profileCompletion: true, profileCompletionUpdatedAt: true },
    })
    .catch((error: unknown) => {
      console.error('Agent dashboard: failed to load agentRow', error)
      return null
    })

  const profileStatus = agentStatus
  // Removed: hard redirect for non-LIVE agents — dashboard now shows onboarding progress tracker instead

  const hasPhoto = Boolean(String((agentRow as any)?.profileImageUrl || (agentRow as any)?.profilePhoto || '').trim())
  const hasBio = Boolean(String(agentRow?.bio || '').trim())
  const hasPhone = Boolean(String(dbUser.phone || '').trim())
  const hasWhatsapp = Boolean(String(agentRow?.whatsapp || agent.whatsapp || '').trim())
  const hasLicense = Boolean(String(agentRow?.license || agent.license || '').trim())

  const leads = await prisma.propertyLead.findMany({
    where: { agentId: agent.id },
    orderBy: { createdAt: 'desc' },
    take: 8,
  })

  const leads30dCount = await prisma.propertyLead.count({
    where: { agentId: agent.id, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  })

  const agentListingCount = await (prisma as any).agentListing
    .count({ where: { agentId: agent.id } })
    .catch((error: unknown) => {
      console.error('Agent dashboard: failed to count agentListing', error)
      return 0
    })

  const leadListingCount = await prisma.propertyLead
    .findMany({
      where: { agentId: agent.id },
      distinct: ['externalId'],
      select: { externalId: true },
    })
    .then((rows: Array<{ externalId: string | null }>) => rows.length)

  const totalListings = agentListingCount > 0 ? agentListingCount : leadListingCount

  const manualApprovedCount = await (prisma as any).manualProperty
    .count({ where: { agentId: agent.id, status: 'PUBLISHED', sourceType: 'MANUAL' } })
    .catch((error: unknown) => {
      console.error('Agent dashboard: failed to count manual approved listings', error)
      return 0
    })

  const completionWeights = { photo: 20, bio: 30, phone: 20, whatsapp: 10, license: 20 }

  const calculatedCompletion =
    (hasPhoto ? completionWeights.photo : 0) +
    (hasBio ? completionWeights.bio : 0) +
    (hasPhone ? completionWeights.phone : 0) +
    (hasWhatsapp ? completionWeights.whatsapp : 0) +
    (hasLicense ? completionWeights.license : 0)

  const completion = agentStatus === 'APPROVED' ? 100 : calculatedCompletion

  const missing: Array<{ key: string; label: string; href: string }> = []
  if (!hasPhoto) missing.push({ key: 'photo', label: 'Add profile photo', href: '/agent/profile?focus=image' })
  if (!hasBio) missing.push({ key: 'bio', label: 'Add bio', href: '/agent/profile?focus=bio' })
  if (!hasPhone) missing.push({ key: 'phone', label: 'Add phone', href: '/agent/profile?focus=phone' })
  if (!hasWhatsapp) missing.push({ key: 'whatsapp', label: 'Add WhatsApp', href: '/agent/profile?focus=whatsapp' })
  if (!hasLicense) missing.push({ key: 'license', label: 'Add license', href: '/agent/profile?focus=license' })
  if (agentStatus === 'APPROVED') missing.length = 0

  const now = Date.now()
  const last = agentRow?.profileCompletionUpdatedAt ? new Date(agentRow.profileCompletionUpdatedAt).getTime() : 0
  const shouldUpdate = !last || now - last > 10 * 60 * 1000
  if (shouldUpdate) {
    await (prisma as any).agent
      .update({
        where: { id: agent.id },
        data: { profileCompletion: completion, profileCompletionUpdatedAt: new Date() },
      })
      .catch((error: unknown) => {
        console.error('Agent dashboard: failed to update profile completion', error)
        return null
      })
  }

  const name = dbUser.name || 'Agent'
  const slug = slugify(name)
  const publicProfileHref = `/agents/${slug ? `${slug}-` : ''}${agent.id}`

  const draftListings = await (prisma as any).manualProperty
    .findMany({
      where: { agentId: agent.id, sourceType: 'MANUAL', status: { in: ['DRAFT', 'REJECTED'] } },
      orderBy: { updatedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        status: true,
        title: true,
        city: true,
        community: true,
        price: true,
        currency: true,
        intent: true,
        propertyType: true,
        bedrooms: true,
        bathrooms: true,
        shortDescription: true,
        category: true,
        squareFeet: true,
        latitude: true,
        longitude: true,
        amenities: true,
        updatedAt: true,
        createdAt: true,
        media: { select: { id: true, category: true, url: true, s3Key: true } },
      },
    })
    .then((rows: any[]) =>
      rows.map((d) => ({
        id: String(d.id),
        status: String(d.status),
        title: String(d.title || 'Untitled draft'),
        location: [d.community, d.city].filter(Boolean).join(', ') || 'Location pending',
        priceLabel:
          typeof d.price === 'number' && d.price > 0
            ? `${String(d.currency || 'AED')} ${d.price.toLocaleString()}`
            : 'Price pending',
        updatedAtLabel: formatRelativeTime(new Date(d.updatedAt || d.createdAt)),
        completionPercent: computeDraftCompletion(d),
        thumbnailUrl: mediaAssetUrl((d.media || []).find((media: any) => String(media?.category) === 'COVER') || d.media?.[0]),
      }))
    )
    .catch((error: unknown) => {
      console.error('Agent dashboard: failed to load manual drafts', error)
      return []
    })

  const publishedManualListings = await (prisma as any).manualProperty
    .findMany({
      where: { agentId: agent.id, sourceType: 'MANUAL', status: 'PUBLISHED' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] } },
    })
    .then((rows: any[]) =>
      rows.map((p: any) => {
        const title = String(p?.title || 'Agent Listing')
        const location = [p?.community, p?.city].filter(Boolean).join(', ') || '—'
        const priceLabel =
          typeof p?.price === 'number' && p.price > 0 ? `${String(p?.currency || 'AED')} ${p.price.toLocaleString()}` : '—'
        const thumb = Array.isArray(p?.media)
          ? String(p.media.find((m: any) => String(m?.category) === 'COVER')?.url || p.media[0]?.url || '')
          : ''

        return {
          id: String(p.id),
          title,
          location,
          priceLabel,
          status: 'Active',
          thumbnailUrl: thumb || undefined,
        }
      })
    )
    .catch((error: unknown) => {
      console.error('Agent dashboard: failed to load published manual listings', error)
      return []
    })

  return (
    <AgentDashboardClient
      agentName={name}
      profileImageUrl={buildAssetUrl(String((agentRow as any)?.profileImageUrl || (agentRow as any)?.profilePhoto || '')) || undefined}
      company={agent.company || ''}
      license={agent.license || ''}
      approved={Boolean(agent.approved)}
      agentStatus={agentStatus}
      profileStatus={agentStatus === 'APPROVED' ? 'APPROVED' : String((agentRow as any)?.profileStatus || (agent as any)?.profileStatus || 'DRAFT')}
      publicProfileHref={publicProfileHref}
      stats={{
        totalListings,
        activeListings: totalListings,
        views30d: 0,
        leadsReceived: leads30dCount,
        contactClicks: 0,
      }}
      profileCompletion={{ percent: completion, missing }}
      submitMeta={{
        license: String(agentRow?.license || agent.license || ''),
        phone: String(dbUser.phone || ''),
        bio: String((agentRow as any)?.bio || ''),
        photo: String((agentRow as any)?.profileImageUrl || (agentRow as any)?.profilePhoto || ''),
        profileCompletion: Math.max(0, Math.min(100, Math.round(completion))),
      }}
      draftListings={Array.isArray(draftListings) ? draftListings : []}
      listings={Array.isArray(publishedManualListings) ? publishedManualListings : []}
      leads={leads.map((l: (typeof leads)[number]) => ({
        id: l.id,
        propertyTitle: `Property ${l.externalId}`,
        contactMethod: 'Enquiry',
        createdAtLabel: formatRelativeTime(l.createdAt),
      }))}
    />
  )
}

