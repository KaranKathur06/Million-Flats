import { prisma } from '@/lib/prisma'

export type AiShieldEntityType = 'MANUAL_PROPERTY' | 'PROJECT'

function getAiShieldResultModel() {
  return (prisma as any).aIShieldResult ?? (prisma as any).AIShieldResult
}

function isOptionalTableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /does not exist|relation .* does not exist|table .* does not exist|column .* does not exist/i.test(message)
}

async function withAiShieldFallback<T>(
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isOptionalTableError(error)) {
      console.warn('[aishield:repository] AIShieldResult table unavailable, using fallback value', {
        error: error instanceof Error ? error.message : String(error),
      })
      return fallback
    }

    throw error
  }
}

export async function findAiShieldResult(entityType: AiShieldEntityType, entityId: string) {
  const aiShieldResultModel = getAiShieldResultModel()
  if (!aiShieldResultModel) {
    return null
  }

  return withAiShieldFallback(async () => {
    return aiShieldResultModel.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    })
  }, null)
}

export async function listAiShieldResults(entityType: AiShieldEntityType) {
  const aiShieldResultModel = getAiShieldResultModel()
  if (!aiShieldResultModel) {
    return []
  }

  return withAiShieldFallback(async () => {
    return aiShieldResultModel.findMany({
      where: { entityType },
      orderBy: { createdAt: 'desc' },
    })
  }, [])
}

export async function upsertAiShieldResult(
  entityType: AiShieldEntityType,
  entityId: string,
  data: Record<string, unknown>,
) {
  const aiShieldResultModel = getAiShieldResultModel()
  if (!aiShieldResultModel) {
    return null
  }

  return withAiShieldFallback(async () => {
    return aiShieldResultModel.upsert({
      where: { entityType_entityId: { entityType, entityId } },
      create: { entityType, entityId, ...data },
      update: data,
    })
  }, null)
}
