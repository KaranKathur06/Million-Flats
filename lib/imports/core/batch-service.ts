import { prisma } from '@/lib/prisma'
import type { ImportEntityType, ImportFormat, ImportMode, ImportOperation } from './types'
import { getImportAdapterForEntity, normalizeImportEntityType } from '@/lib/imports/registry'

export async function createImportBatch(input: {
  entityType: ImportEntityType
  operation: ImportOperation
  mode: ImportMode
  originalFileName: string
  format: ImportFormat
  mimeType: string
  byteSize: number
  checksum: string
  uploadedByUserId: string
  adapterVersion: number
  sourceProvider?: string | null
  sourceProfileKey?: string | null
  category?: string | null
}) {
  const entityType = normalizeImportEntityType(input.entityType) as ImportEntityType
  const adapter = getImportAdapterForEntity(entityType)
  if (!adapter) throw new Error(`No import adapter is registered for ${entityType}.`)
  if (adapter.adapterVersion !== input.adapterVersion) throw new Error(`Import adapter version mismatch for ${entityType}.`)

  return (prisma as any).importBatch.create({
    data: {
      entityType,
      operation: input.operation,
      mode: input.mode,
      originalFileName: input.originalFileName,
      format: input.format,
      mimeType: input.mimeType,
      byteSize: input.byteSize,
      checksum: input.checksum,
      uploadedByUserId: input.uploadedByUserId,
      adapterVersion: input.adapterVersion,
      sourceProvider: input.sourceProvider || null,
      sourceProfileKey: input.sourceProfileKey || null,
      category: input.category || null,
    },
  })
}

export async function stageImportRecord(input: {
  batchId: string
  sourceRecordId: string
  sourceRow?: number | null
  sourcePath?: string | null
  raw: unknown
  normalized?: unknown
  canonical?: unknown
  mappingVersion?: number
  overallConfidence?: number | null
  status?: string
  sourceProvider?: string | null
  sourceUrl?: string | null
  sourceListingId?: string | null
}) {
  return (prisma as any).importRecord.upsert({
    where: { batchId_sourceRecordId: { batchId: input.batchId, sourceRecordId: input.sourceRecordId } },
    create: {
      batchId: input.batchId,
      sourceRecordId: input.sourceRecordId,
      sourceRow: input.sourceRow ?? null,
      sourcePath: input.sourcePath || null,
      rawPayload: input.raw ?? null,
      normalizedPayload: input.normalized ?? null,
      canonicalPayload: input.canonical ?? null,
      mappingVersion: input.mappingVersion || 1,
      overallConfidence: input.overallConfidence ?? null,
      status: input.status || 'DISCOVERED',
      sourceProvider: input.sourceProvider || null,
      sourceUrl: input.sourceUrl || null,
      sourceListingId: input.sourceListingId || null,
    },
    update: {
      sourceRow: input.sourceRow ?? null,
      sourcePath: input.sourcePath || null,
      rawPayload: input.raw ?? null,
      normalizedPayload: input.normalized ?? null,
      canonicalPayload: input.canonical ?? null,
      mappingVersion: input.mappingVersion || 1,
      overallConfidence: input.overallConfidence ?? null,
      status: input.status || 'DISCOVERED',
    },
  })
}

export async function stageImportRecordsBatch(inputs: Array<{
  batchId: string
  sourceRecordId: string
  sourceRow?: number | null
  sourcePath?: string | null
  raw: unknown
  normalized?: unknown
  canonical?: unknown
  mappingVersion?: number
  overallConfidence?: number | null
  status?: string
  sourceProvider?: string | null
  sourceUrl?: string | null
  sourceListingId?: string | null
}>) {
  if (inputs.length === 0) return []

  // Use createMany with skipDuplicates for fast bulk insert
  // This is 10-100x faster than individual upserts
  try {
    await (prisma as any).importRecord.createMany({
      data: inputs.map((input) => ({
        batchId: input.batchId,
        sourceRecordId: input.sourceRecordId,
        sourceRow: input.sourceRow ?? null,
        sourcePath: input.sourcePath || null,
        rawPayload: input.raw ?? null,
        normalizedPayload: input.normalized ?? null,
        canonicalPayload: input.canonical ?? null,
        mappingVersion: input.mappingVersion || 1,
        overallConfidence: input.overallConfidence ?? null,
        status: input.status || 'DISCOVERED',
        sourceProvider: input.sourceProvider || null,
        sourceUrl: input.sourceUrl || null,
        sourceListingId: input.sourceListingId || null,
      })),
      skipDuplicates: true,
    })
  } catch (error) {
    // If createMany fails, fall back to individual creates
    // This handles edge cases while still being much faster for new records
    for (const input of inputs) {
      try {
        await (prisma as any).importRecord.upsert({
          where: { batchId_sourceRecordId: { batchId: input.batchId, sourceRecordId: input.sourceRecordId } },
          create: {
            batchId: input.batchId,
            sourceRecordId: input.sourceRecordId,
            sourceRow: input.sourceRow ?? null,
            sourcePath: input.sourcePath || null,
            rawPayload: input.raw ?? null,
            normalizedPayload: input.normalized ?? null,
            canonicalPayload: input.canonical ?? null,
            mappingVersion: input.mappingVersion || 1,
            overallConfidence: input.overallConfidence ?? null,
            status: input.status || 'DISCOVERED',
            sourceProvider: input.sourceProvider || null,
            sourceUrl: input.sourceUrl || null,
            sourceListingId: input.sourceListingId || null,
          },
          update: {},
        })
      } catch {
        // Silently skip duplicates on fallback
      }
    }
  }

  return inputs
}

export async function updateImportBatchCounters(batchId: string, data: Record<string, number>) {
  return (prisma as any).importBatch.update({ where: { id: batchId }, data })
}
