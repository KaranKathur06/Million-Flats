import { prisma } from '@/lib/prisma'
import { verifySchemaCompatibility } from '@/lib/schemaCompat'

export async function validateSchemaCompatibility() {
  return verifySchemaCompatibility(prisma)
}
