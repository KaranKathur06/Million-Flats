import { AIShieldPropertyType, AIShieldStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type AiShieldEntityType = 'PROJECT' | 'MANUAL_PROPERTY'

function normalizeEntityType(entityType: AiShieldEntityType | AIShieldPropertyType) {
  const normalized = String(entityType).toUpperCase()
  if (normalized === 'PROJECT') return AIShieldPropertyType.PROJECT
  return AIShieldPropertyType.MANUAL_PROPERTY
}

export async function listAiShieldResults(entityType: AiShieldEntityType | AIShieldPropertyType) {
  return prisma.aIShieldResult.findMany({
    where: { entityType: normalizeEntityType(entityType) },
    orderBy: { computedAt: 'desc' },
  })
}

export async function findAiShieldResult(
  entityType: AiShieldEntityType | AIShieldPropertyType,
  entityId: string,
) {
  return prisma.aIShieldResult.findFirst({
    where: {
      entityType: normalizeEntityType(entityType),
      entityId,
    },
    orderBy: { computedAt: 'desc' },
  })
}

export async function upsertAiShieldResult(
  entityType: AiShieldEntityType | AIShieldPropertyType,
  entityId: string,
  data: {
    estimatedMin?: number
    estimatedMax?: number
    estimatedMedian?: number
    confidence?: number
    confidenceReasons?: Prisma.InputJsonValue | null
    askingPrice?: number | null
    deviation?: number
    status?: AIShieldStatus
    pricePosition?: number | null
    comparablesCount?: number
    avgPricePerSqft?: number | null
    medianPrice?: number | null
    demandScore?: number | null
    listingVelocity?: number | null
    avgDaysOnMarket?: number | null
    estimatedRentalMin?: number | null
    estimatedRentalMax?: number | null
    rentalYield?: number | null
    suggestedMinPrice?: number | null
    suggestedMaxPrice?: number | null
    modelVersion?: string
    computedAt?: Date
    expiresAt?: Date
  },
) {
  const normalizedEntityType = normalizeEntityType(entityType)
  const existing = await prisma.aIShieldResult.findFirst({
    where: {
      entityType: normalizedEntityType,
      entityId,
    },
  })

  const updatePayload = {
    ...data,
    entityType: normalizedEntityType,
    entityId,
    confidenceReasons:
      data.confidenceReasons === undefined
        ? undefined
        : data.confidenceReasons === null
          ? Prisma.JsonNull
          : (data.confidenceReasons as Prisma.InputJsonValue),
  } as any

  if (existing) {
    return prisma.aIShieldResult.update({
      where: { id: existing.id },
      data: updatePayload,
    })
  }

  return prisma.aIShieldResult.create({
    data: {
      entityType: normalizedEntityType,
      entityId,
      estimatedMin: data.estimatedMin ?? 0,
      estimatedMax: data.estimatedMax ?? 0,
      estimatedMedian: data.estimatedMedian ?? 0,
      confidence: data.confidence ?? 0,
      confidenceReasons:
        data.confidenceReasons === undefined
          ? undefined
          : data.confidenceReasons === null
            ? Prisma.JsonNull
            : (data.confidenceReasons as Prisma.InputJsonValue),
      askingPrice: data.askingPrice ?? null,
      deviation: data.deviation ?? 0,
      status: data.status ?? 'FAIR',
      pricePosition: data.pricePosition ?? null,
      comparablesCount: data.comparablesCount ?? 0,
      avgPricePerSqft: data.avgPricePerSqft ?? null,
      medianPrice: data.medianPrice ?? null,
      demandScore: data.demandScore ?? null,
      listingVelocity: data.listingVelocity ?? null,
      avgDaysOnMarket: data.avgDaysOnMarket ?? null,
      estimatedRentalMin: data.estimatedRentalMin ?? null,
      estimatedRentalMax: data.estimatedRentalMax ?? null,
      rentalYield: data.rentalYield ?? null,
      suggestedMinPrice: data.suggestedMinPrice ?? null,
      suggestedMaxPrice: data.suggestedMaxPrice ?? null,
      modelVersion: data.modelVersion ?? '1.0.0',
      computedAt: data.computedAt ?? new Date(),
      expiresAt: data.expiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24),
    } as any,
  })
}
