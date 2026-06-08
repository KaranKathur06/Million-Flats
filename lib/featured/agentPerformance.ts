import { prisma } from '@/lib/prisma'

function safeNumber(v: unknown) {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function recomputeAgentResponseRate(agentId: string) {
  const agent = await (prisma as any).agent
    ?.findUnique({
      where: { id: agentId },
      select: { id: true, totalLeads: true, respondedLeads: true },
    })
    .catch(() => null)

  if (!agent?.id) return { ok: false as const, responseRate: 0 }

  const totalLeads = safeNumber(agent.totalLeads)
  const respondedLeads = safeNumber(agent.respondedLeads)

  const responseRate = totalLeads > 0 ? (respondedLeads / totalLeads) * 100 : 0

  await (prisma as any).agent
    .update({
      where: { id: agentId },
      data: { responseRate },
      select: { id: true },
    })
    .catch(() => null)

  return { ok: true as const, responseRate }
}
