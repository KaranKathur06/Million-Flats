/** True when Prisma cannot reach the database (local dev, network, RDS security group, etc.). */
export function isPrismaConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const code = 'code' in error ? String((error as { code?: string }).code) : ''
  if (code === 'P1001' || code === 'P1002' || code === 'P1008' || code === 'P1017') return true

  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  return (
    lower.includes("can't reach database server") ||
    lower.includes('connection refused') ||
    lower.includes('timed out') ||
    lower.includes('econnrefused') ||
    lower.includes('enotfound') ||
    lower.includes('connection pool timeout')
  )
}
