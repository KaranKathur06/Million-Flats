import { prisma } from '@/lib/prisma'

export async function getImportRequestResult(batchId: string, idempotencyKey: string) {
  return (prisma as any).importRequestIdempotency.findUnique({
    where: { batchId_idempotencyKey: { batchId, idempotencyKey } },
  })
}

export async function saveImportRequestResult(batchId: string, idempotencyKey: string, response: unknown) {
  return (prisma as any).importRequestIdempotency.upsert({
    where: { batchId_idempotencyKey: { batchId, idempotencyKey } },
    create: { batchId, idempotencyKey, response },
    update: { response },
  })
}
