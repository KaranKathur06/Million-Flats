import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { batchId: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    const body = await req.json().catch(() => ({}))
    const mappings = Array.isArray(body.mappings) ? body.mappings : []
    const result = await (prisma as any).$transaction(async (tx: any) => {
      const batch = await tx.importBatch.findUnique({ where: { id: params.batchId }, select: { id: true, mappingVersion: true } })
      if (!batch) throw new Error('Import batch not found.')
      const nextVersion = batch.mappingVersion + 1
      await tx.importMapping.deleteMany({ where: { batchId: params.batchId } })
      if (mappings.length) {
        await tx.importMapping.createMany({
          data: mappings.map((mapping: any) => ({
            batchId: params.batchId,
            sourcePath: String(mapping.sourcePath || ''),
            canonicalField: String(mapping.canonicalField || ''),
            status: mapping.status === 'ACCEPTED' ? 'ACCEPTED' : mapping.status === 'IGNORED' ? 'IGNORED' : 'REVIEW',
            confidence: typeof mapping.confidence === 'number' ? mapping.confidence : null,
            mappingVersion: nextVersion,
          })),
        })
      }
      await tx.importRecord.updateMany({ where: { batchId: params.batchId, status: { not: 'COMMITTED' } }, data: { status: 'DISCOVERED', normalizedPayload: null, canonicalPayload: null, overallConfidence: null } })
      await tx.importBatch.update({ where: { id: params.batchId }, data: { status: 'READY_FOR_REVIEW', mappingVersion: nextVersion } })
      return { batchId: params.batchId, status: 'READY_FOR_REVIEW', savedMappings: mappings.length, updatedByUserId: auth.userId }
    })
    return NextResponse.json({ success: true, ...result, savedMappings: mappings.length, updatedByUserId: auth.userId })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Mapping update failed.' }, { status: 409 })
  }
}
