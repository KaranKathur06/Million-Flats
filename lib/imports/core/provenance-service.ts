import { prisma } from '@/lib/prisma'

export async function linkImportRecordToManualProperty(input: {
  recordId: string
  propertyId: string
  ownershipPolicy?: string | null
}) {
  return (prisma as any).importRecord.update({
    where: { id: input.recordId },
    data: {
      targetEntityType: 'PROPERTY',
      targetEntityId: input.propertyId,
      manualPropertyId: input.propertyId,
      ownershipPolicy: input.ownershipPolicy || null,
      status: 'COMMITTED',
    },
  })
}
