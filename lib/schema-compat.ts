import { prisma } from '@/lib/prisma'

export async function validateSchemaCompatibility() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { ok: true, checkedAt: new Date().toISOString() }
  } catch (error) {
    return { ok: false, checkedAt: new Date().toISOString(), error: String(error) }
  }
}
