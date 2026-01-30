import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AgentDashboardClient from './AgentDashboardClient'

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

export default async function AgentDashboardPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/agent/login?next=%2Fagent-portal')
  }

  if (role !== 'AGENT') {
    redirect('/user/dashboard')
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    redirect('/agent/login?next=%2Fagent-portal')
  }

  const dbUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
  if (!dbUser || !dbUser.agent) {
    redirect('/agent/login?next=%2Fagent-portal')
  }

  const agent = dbUser.agent

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
    .catch(() => 0)

  const leadListingCount = await prisma.propertyLead
    .findMany({
      where: { agentId: agent.id },
      distinct: ['externalId'],
      select: { externalId: true },
    })
    .then((rows) => rows.length)

  const totalListings = agentListingCount > 0 ? agentListingCount : leadListingCount

  const name = dbUser.name || 'Agent'
  const slug = slugify(name)
  const publicProfileHref = `/agents/${slug ? `${slug}-` : ''}${agent.id}`

  return (
    <AgentDashboardClient
      agentName={name}
      company={agent.company || ''}
      license={agent.license || ''}
      approved={Boolean(agent.approved)}
      publicProfileHref={publicProfileHref}
      stats={{
        totalListings,
        activeListings: totalListings,
        views30d: 0,
        leadsReceived: leads30dCount,
        contactClicks: 0,
      }}
      listings={[]}
      leads={leads.map((l) => ({
        id: l.id,
        propertyTitle: `Property ${l.externalId}`,
        contactMethod: 'Enquiry',
        createdAtLabel: formatRelativeTime(l.createdAt),
      }))}
    />
  )
}

