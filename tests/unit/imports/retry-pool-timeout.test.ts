import { afterEach, describe, expect, it, jest } from '@jest/globals'
import {
  isPrismaInfrastructureError,
  isPrismaPoolTimeout,
  withPrismaPoolTimeoutRetry,
} from '@/lib/imports/core/retry-pool-timeout'

const prismaError = (name: string, code?: string) => Object.assign(
  new Error(code === 'P2024' ? 'Timed out fetching a new connection from the connection pool.' : 'Prisma operation failed.'),
  { name, code, clientVersion: '5.22.0' },
)

const poolTimeout = () => prismaError('PrismaClientKnownRequestError', 'P2024')

const context = { batchId: 'batch-1', recordId: 'record-1', operation: 'analysis checkpoint' as const }

afterEach(() => {
  jest.useRealTimers()
  jest.restoreAllMocks()
})

describe('Prisma pool timeout handling', () => {
  it('retries P2024 after exactly 250ms and 750ms, then returns success', async () => {
    jest.useFakeTimers()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const retryError = poolTimeout()
    const operation = jest.fn<() => Promise<string>>()
      .mockRejectedValueOnce(retryError)
      .mockRejectedValueOnce(retryError)
      .mockResolvedValue('checkpointed')
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
    const result = withPrismaPoolTimeoutRetry(operation, context)

    await jest.runAllTimersAsync()

    await expect(result).resolves.toBe('checkpointed')
    expect(operation).toHaveBeenCalledTimes(3)
    expect(setTimeoutSpy.mock.calls.map((call) => call[1])).toEqual([250, 750])
    warn.mockRestore()
  })

  it('does not retry non-P2024 Prisma errors', async () => {
    const transactionError = prismaError('PrismaClientKnownRequestError', 'P2028')
    const operation = jest.fn<() => Promise<void>>().mockRejectedValue(transactionError)

    await expect(withPrismaPoolTimeoutRetry(operation, context)).rejects.toBe(transactionError)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('retries no more than twice and surfaces the last P2024 error', async () => {
    jest.useFakeTimers()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const retryError = poolTimeout()
    const operation = jest.fn<() => Promise<void>>().mockRejectedValue(retryError)
    const result = withPrismaPoolTimeoutRetry(operation, context)
    const resultExpectation = expect(result).rejects.toBe(retryError)

    await jest.runAllTimersAsync()

    await resultExpectation
    expect(operation).toHaveBeenCalledTimes(3)
    warn.mockRestore()
  })

  it('classifies initialization failures as infrastructure errors but not retryable pool timeouts', () => {
    const initializationError = prismaError('PrismaClientInitializationError')

    expect(isPrismaPoolTimeout(initializationError)).toBe(false)
    expect(isPrismaInfrastructureError(initializationError)).toBe(true)
    expect(isPrismaPoolTimeout(poolTimeout())).toBe(true)
  })
})
