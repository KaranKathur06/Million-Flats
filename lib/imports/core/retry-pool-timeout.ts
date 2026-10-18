import { isPrismaPoolTimeout } from '@/lib/prismaErrors'

export { isPrismaPoolTimeout } from '@/lib/prismaErrors'

const POOL_TIMEOUT_RETRY_DELAYS_MS = [250, 750] as const
const TRANSACTION_START_TIMEOUT_MESSAGE = 'Unable to start a transaction in the given time.'

function hasPrismaErrorIdentity(error: unknown, name: string): error is Error & { clientVersion: string } {
  return error instanceof Error &&
    error.name === name &&
    'clientVersion' in error &&
    typeof error.clientVersion === 'string'
}

export function isPrismaTransactionStartTimeout(error: unknown): boolean {
  return hasPrismaErrorIdentity(error, 'PrismaClientKnownRequestError') &&
    'code' in error &&
    error.code === 'P2028' &&
    error.message.includes(TRANSACTION_START_TIMEOUT_MESSAGE)
}

function isPrismaAcquisitionTimeout(error: unknown): boolean {
  return isPrismaPoolTimeout(error) || isPrismaTransactionStartTimeout(error)
}

export function isPrismaInfrastructureError(error: unknown): boolean {
  return isPrismaAcquisitionTimeout(error) || hasPrismaErrorIdentity(error, 'PrismaClientInitializationError')
}

export async function withPrismaAcquisitionRetry<T>(
  operation: () => Promise<T>,
  context: { batchId: string; recordId: string; operation: string },
): Promise<T> {
  for (let retryIndex = 0; ; retryIndex += 1) {
    try {
      return await operation()
    } catch (error) {
      if (!isPrismaAcquisitionTimeout(error) || retryIndex >= POOL_TIMEOUT_RETRY_DELAYS_MS.length) {
        throw error
      }

      const delayMs = POOL_TIMEOUT_RETRY_DELAYS_MS[retryIndex]
      console.warn(
        `[Import] Retrying ${context.operation} after Prisma connection/transaction acquisition timeout for batch ${context.batchId}, record ${context.recordId} (retry ${retryIndex + 1}/${POOL_TIMEOUT_RETRY_DELAYS_MS.length} in ${delayMs}ms).`,
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}
