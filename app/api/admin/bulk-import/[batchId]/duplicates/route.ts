import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function POST(_req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    const records = await (prisma as any).importRecord.findMany({ where: { batchId: params.batchId }, select: { id: true, canonicalPayload: true } })
    let exact = 0
    let potential = 0
    for (const record of records) {
      const payload = record.canonicalPayload as any
      const filters = []
      if (payload?.sourceProvider && payload?.sourceListingId) filters.push({ sourceProvider: payload.sourceProvider, sourceListingId: payload.sourceListingId })
      if (payload?.sourceUrl) filters.push({ sourceUrl: payload.sourceUrl })
      const existing = filters.length ? await (prisma as any).manualProperty.findFirst({ where: { OR: filters }, select: { id: true } }) : null
      if (existing) {
        exact += 1
        await (prisma as any).importRecord.update({ where: { id: record.id }, data: { status: 'DUPLICATE_REVIEW', duplicateClass: 'EXACT_DUPLICATE', duplicateMetadata: { targetId: existing.id } } })
      } else {
        potential += 1
      }
    }
    await (prisma as any).importBatch.update({ where: { id: params.batchId }, data: { duplicateCount: exact } })
    return NextResponse.json({ success: true, batchId: params.batchId, exactDuplicates: exact, potentialCandidates: potential, analyzedByUserId: auth.userId })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Duplicate analysis failed.' }, { status: 500 })
  }
}
