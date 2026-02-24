import { prisma } from '@/lib/prisma'

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function recomputeFeaturedScore(agentId: string) {
  const agent = await (prisma as any).agent
    ?.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        totalListings: true,
        totalLeads: true,
        responseRate: true,
        profileCompletion: true,
        isFeaturedManual: true,
      },
    })
    .catch(() => null)

  if (!agent?.id) return { ok: false as const, message: 'Agent not found' }

  const totalListings = safeNumber(agent.totalListings)
  const totalLeads = safeNumber(agent.totalLeads)
  const responseRate = safeNumber(agent.responseRate)
  const profileCompletion = safeNumber(agent.profileCompletion)
  const manualBoost = agent.isFeaturedManual ? 1000 : 0

  const score =
    totalListings * 5 +
    responseRate * 20 +
    profileCompletion * 3 +
    totalLeads * 2 +
    manualBoost

  const featuredScore = Math.floor(score)

  await (prisma as any).agent
    .update({
      where: { id: agentId },
      data: { featuredScore },
      select: { id: true },
    })
    .catch(() => null)

  return { ok: true as const, featuredScore }
}
