import { prisma } from '@/lib/prisma'

export type LeadMagnetStatusValue = 'DRAFT' | 'UPLOADED' | 'PUBLISHED' | 'ACTIVE'
export type LeadMagnetStatusResponse = 'draft' | 'uploaded' | 'published' | 'active'

export class LeadMagnetStatusNotReadyError extends Error {
  constructor() {
    super('Lead magnet status migration is not applied. Run the latest Prisma migration before using lead magnets.')
    this.name = 'LeadMagnetStatusNotReadyError'
  }
}

let statusReadyCache: boolean | null = null

export function determineLeadMagnetStatus(item: { fileS3Key?: string | null; isActive?: boolean; popupEnabled?: boolean }): LeadMagnetStatusValue {
  if (!String(item.fileS3Key || '').trim()) return 'DRAFT'
  if (Boolean(item.isActive)) return 'ACTIVE'
  if (Boolean(item.popupEnabled)) return 'PUBLISHED'
  return 'UPLOADED'
}

export function toClientLeadMagnetStatus(status: unknown, fallback: { fileS3Key?: string | null; isActive?: boolean; popupEnabled?: boolean }): LeadMagnetStatusResponse {
  const normalized = String(status || '').trim().toUpperCase()
  const finalStatus = (normalized || determineLeadMagnetStatus(fallback)) as LeadMagnetStatusValue
  return finalStatus.toLowerCase() as LeadMagnetStatusResponse
}

export function normalizeLeadMagnetStatus(input: unknown): LeadMagnetStatusValue | null {
  const value = String(input || '').trim().toUpperCase()
  if (value === 'DRAFT' || value === 'UPLOADED' || value === 'PUBLISHED' || value === 'ACTIVE') {
    return value
  }
  return null
}

export function flagsFromLeadMagnetStatus(status: LeadMagnetStatusValue) {
  switch (status) {
    case 'ACTIVE':
      return { isActive: true, popupEnabled: true }
    case 'PUBLISHED':
      return { isActive: false, popupEnabled: true }
    case 'UPLOADED':
      return { isActive: false, popupEnabled: false }
    case 'DRAFT':
    default:
      return { isActive: false, popupEnabled: false }
  }
}

export async function ensureLeadMagnetStatusReady() {
  if (statusReadyCache) return

  const rows = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'lead_magnets'
        AND column_name = 'status'
    ) AS exists
  `)

  const exists = Boolean(rows?.[0]?.exists)
  if (!exists) {
    statusReadyCache = false
    throw new LeadMagnetStatusNotReadyError()
  }

  statusReadyCache = true
}
