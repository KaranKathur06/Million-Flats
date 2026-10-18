import { PrismaClient } from '@prisma/client'

function getPrismaDatasourceUrl() {
  const rawUrl = process.env.DATABASE_URL || ''
  if (!rawUrl) return rawUrl

  try {
    const url = new URL(rawUrl)
    const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT || '20'
    const poolTimeout = process.env.PRISMA_POOL_TIMEOUT || '20'

    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', connectionLimit)
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', poolTimeout)
    }

    return url.toString()
  } catch {
    return rawUrl
  }
}

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: getPrismaDatasourceUrl(),
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
