const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const apply = process.argv.includes('--apply')
const batchSize = 100

function isUniqueError(error) {
  return Boolean(error && error.code === 'P2002')
}

async function main() {
  let cursor
  let scanned = 0
  let inserted = 0
  let alreadyMigrated = 0
  let ambiguous = 0

  while (true) {
    const sourceRows = await prisma.ecosystemLead.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      include: { category: { select: { slug: true, title: true } } },
    })
    if (!sourceRows.length) break
    cursor = sourceRows[sourceRows.length - 1].id

    for (const source of sourceRows) {
      scanned += 1
      const existing = await prisma.lead.findUnique({
        where: {
          legacyTable_legacyId: {
            legacyTable: 'ecosystem_leads',
            legacyId: source.id,
          },
        },
        select: { id: true },
      })
      if (existing) {
        alreadyMigrated += 1
        continue
      }

      const candidates = await prisma.lead.findMany({
        where: {
          leadType: 'ECOSYSTEM',
          deletedAt: null,
          ecosystemPartnerId: source.partnerId,
          email: source.email.trim().toLowerCase(),
          phone: source.phone,
          message: source.message,
        },
        select: { id: true },
        take: 2,
      })
      if (candidates.length) {
        ambiguous += 1
        console.warn(JSON.stringify({
          action: 'REQUIRES_RECONCILIATION',
          legacyId: source.id,
          candidateLeadIds: candidates.map((candidate) => candidate.id),
        }))
        continue
      }

      if (!apply) continue

      try {
        await prisma.lead.create({
          data: {
            leadType: 'ECOSYSTEM',
            category: source.category.slug,
            ecosystemPartnerId: source.partnerId,
            sourceId: source.partnerId,
            sourceName: source.leadSource || source.category.title,
            name: source.name,
            email: source.email.trim().toLowerCase(),
            phone: source.phone,
            message: source.message,
            propertyType: source.propertyType,
            budgetRange: source.budgetRange,
            status: source.status,
            assignedTo: source.assignedTo,
            sourceType: 'ECOSYSTEM_LEGACY_BACKFILL',
            sourceUrl: source.sourcePage,
            landingUrl: source.sourcePage,
            legacyTable: 'ecosystem_leads',
            legacyId: source.id,
            metadata: {
              ecosystemCategorySlug: source.category.slug,
              ecosystemCategoryTitle: source.category.title,
              legacySource: source.source,
              legacyLeadSource: source.leadSource,
              legacyRequirement: source.requirement,
              legacySourcePage: source.sourcePage,
              legacyStatus: source.status,
              backfillVersion: 1,
              consentStatus: 'UNKNOWN_LEGACY',
            },
            createdAt: source.createdAt,
          },
        })
        inserted += 1
      } catch (error) {
        if (isUniqueError(error)) {
          alreadyMigrated += 1
          continue
        }
        throw error
      }
    }

    if (sourceRows.length < batchSize) break
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    scanned,
    inserted,
    alreadyMigrated,
    ambiguous,
    message: ambiguous
      ? 'Ambiguous possible CRM duplicates were not merged. Reconcile them manually before cutover.'
      : 'Source EcosystemLead rows were preserved.',
  }, null, 2))
  if (apply && ambiguous) process.exitCode = 2
}

main()
  .catch((error) => {
    console.error('[ecosystem-lead-backfill] Failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
