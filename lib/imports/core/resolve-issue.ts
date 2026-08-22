import { prisma } from '@/lib/prisma'

export async function resolveImportIssue(input: {
  batchId: string
  issueId: string
  userId: string
  state: 'RESOLVED' | 'IGNORED'
  note?: string | null
}) {
  const issue = await (prisma as any).importIssue.updateMany({
    where: { id: input.issueId, batchId: input.batchId, resolutionState: 'OPEN' },
    data: {
      resolutionState: input.state,
      resolvedByUserId: input.userId,
      resolvedAt: new Date(),
      resolutionNote: input.note || null,
    },
  })
  if (issue.count !== 1) throw new Error('Import issue not found or already resolved.')
  return { batchId: input.batchId, issueId: input.issueId, resolutionState: input.state }
}
