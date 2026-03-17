const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * migrate-architecture.ts (Phase 1)
 * 
 * Maps old string columns to new State Enums securely before removing them from schema.
 */

async function main() {
  console.log('🚀 Starting architecture Phase 1 migration script...')

  // 1. Migrate Agent Statuses from old columns to new `status` enum column
  console.log('🔄 Mapping old Agent profile_status to new AgentStatus enum...')
  const agents = await prisma.agent.findMany()

  let updatedAgents = 0
  for (const agent of agents) {
    let newStatus = 'REGISTERED'

    const oldStatus = agent.profileStatus?.toUpperCase() || ''

    // Map old states
    if (agent.approved) {
      newStatus = 'APPROVED'
    } else if (oldStatus === 'LIVE') {
      newStatus = 'APPROVED'
    } else if (oldStatus === 'UNDER_REVIEW') {
      newStatus = 'UNDER_REVIEW'
    } else if (oldStatus === 'PROFILE_COMPLETED') {
      newStatus = 'PROFILE_COMPLETED'
    } else if (agent.profileCompletion > 0) {
      newStatus = 'PROFILE_INCOMPLETE'
    }

    if (agent.status !== newStatus) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { status: newStatus as any }
      })
      updatedAgents++
    }
  }
  console.log(`✅ Updated ${updatedAgents} agents with new unified status.`)


  // 2. Migrate Inquiry Statuses
  console.log('🔄 Mapping old Inquiry statuses...')
  let inquiryCount = 0
  
  // PENDING -> NEW
  const pUpdates = await prisma.inquiry.updateMany({
    where: { status: 'PENDING' as any },
    data: { status: 'NEW' as any }
  })
  inquiryCount += pUpdates.count

  // RESPONDED -> CONTACTED
  const rUpdates = await prisma.inquiry.updateMany({
    where: { status: 'RESPONDED' as any },
    data: { status: 'CONTACTED' as any }
  })
  inquiryCount += rUpdates.count

  console.log(`✅ Migrated ${inquiryCount} Inquiries.`)


  // 3. Migrate AgentVerificationDocumentTypes
  console.log('🔄 Mapping Agent Verification document types...')
  let docCount = 0

  const docMap = {
    'LICENSE': 'REAL_ESTATE_LICENSE',
    'RERA_CERTIFICATE': 'REAL_ESTATE_LICENSE',
    'BROKER_LICENSE': 'REAL_ESTATE_LICENSE',
    
    'ID': 'GOVERNMENT_ID',
    'PAN': 'GOVERNMENT_ID',
    'AADHAR': 'GOVERNMENT_ID',
    'PASSPORT': 'GOVERNMENT_ID',
    
    'GST_CERTIFICATE': 'AGENCY_CERTIFICATE',
    'SELFIE_ID': 'SELFIE_VERIFICATION'
  }

  for (const [oldType, newType] of Object.entries(docMap)) {
    const chunk = await prisma.agentVerification.updateMany({
      where: { documentType: oldType as any },
      data: { documentType: newType as any }
    })
    docCount += chunk.count
  }

  console.log(`✅ Migrated ${docCount} Agent Verification documents.`)


  // 4. Backfill BASIC limit subscriptions for all APPROVED agents
  console.log('🔄 Backfilling Subscriptions...')
  const agentsNeedSubs = await prisma.agent.findMany({
    where: { status: 'APPROVED', subscription: null }
  })

  let createdSubs = 0
  const now = new Date()
  for (const agent of agentsNeedSubs) {
    // Upsert to handle any race conditions
    await prisma.agentSubscription.upsert({
      where: { agentId: agent.id },
      create: {
        agentId: agent.id,
        plan: 'BASIC',
        status: 'ACTIVE',
        startDate: now,
        listingsLimit: 10,
        featuredLimit: 0,
        leadPriority: 'LOW'
      },
      update: {}
    })
    createdSubs++
  }
  console.log(`✅ Backfilled ${createdSubs} new BASIC agent subscriptions.`)

  console.log('✨ Data migration complete. You can now safely remove Phase 1 columns/enums from schema.prisma and run db push again.')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
