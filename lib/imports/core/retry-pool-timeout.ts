const POOL_TIMEOUT_RETRY_DELAYS_MS = [250, 750] as const

function hasPrismaErrorIdentity(error: unknown, name: string): error is Error & { clientVersion: string } {
  return error instanceof Error &&
    error.name === name &&
    'clientVersion' in error &&
    typeof error.clientVersion === 'string'
}

export function isPrismaPoolTimeout(error: unknown): boolean {
  return hasPrismaErrorIdentity(error, 'PrismaClientKnownRequestError') &&
    'code' in error &&
    error.code === 'P2024'
}

export function isPrismaInfrastructureError(error: unknown): boolean {
  return isPrismaPoolTimeout(error) || hasPrismaErrorIdentity(error, 'PrismaClientInitializationError')
}

export async function withPrismaPoolTimeoutRetry<T>(
  operation: () => Promise<T>,
  context: { batchId: string; recordId: string; operation: 'relation resolution' | 'analysis checkpoint' },
): Promise<T> {
  for (let retryIndex = 0; ; retryIndex += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isPrismaPoolTimeout(error) || retryIndex >= POOL_TIMEOUT_RETRY_DELAYS_MS.length) {
        throw error
      }

      const delayMs = POOL_TIMEOUT_RETRY_DELAYS_MS[retryIndex]
      console.warn(
        `[Background Analysis] Retrying ${context.operation} after Prisma pool timeout for batch ${context.batchId}, record ${context.recordId} (retry ${retryIndex + 1}/${POOL_TIMEOUT_RETRY_DELAYS_MS.length} in ${delayMs}ms).`,
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}
