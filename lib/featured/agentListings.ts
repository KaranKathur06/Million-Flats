import { prisma } from '@/lib/prisma'

export async function recomputeAgentTotalListings(agentId: string) {
  const externalCount = await (prisma as any).agentListing
    ?.count({ where: { agentId } })
    .catch(() => 0)

  const manualApprovedCount = await (prisma as any).manualProperty
    ?.count({ where: { agentId, status: 'APPROVED', sourceType: 'MANUAL' } })
    .catch(() => 0)

  const totalListings = (typeof externalCount === 'number' ? externalCount : 0) +
    (typeof manualApprovedCount === 'number' ? manualApprovedCount : 0)

  await (prisma as any).agent
    ?.update({ where: { id: agentId }, data: { totalListings }, select: { id: true } })
    .catch(() => null)

  return { ok: true as const, totalListings }
}
