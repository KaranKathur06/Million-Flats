const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * migrate-architecture.ts
 * 
 * Backfills missing data to support the new unified strict AgentStatus architecture.
 * This script ensures current production users don't break when deploying the new schema.
 * 
 * Run using: npx ts-node scripts/migrate-architecture.ts
 */

async function main() {
  console.log('🚀 Starting architecture migration script...')

  // 1. Migrate Agent Statuses
  console.log('🔄 Migrating Agent statuses...')
  
  // Find all agents that might need state inference due to schema change
  const agents = await prisma.agent.findMany({
    include: {
      user: true,
      documents: true,
      subscription: true
    }
  })

  let updatedAgents = 0
  for (const agent of agents) {
    let newStatus = 'REGISTERED'

    // Simple inference engine based on old data shapes
    if (agent.approved) {
      newStatus = 'APPROVED'
    } else if (agent.documents.length >= 2) {
      // Assuming they uploaded at least 2 docs, they are under review or docs uploaded
      newStatus = 'UNDER_REVIEW'
    } else if (agent.profileCompletion && agent.profileCompletion > 70) {
      newStatus = 'PROFILE_COMPLETED'
    } else if (agent.profileCompletion && agent.profileCompletion > 0) {
      newStatus = 'PROFILE_INCOMPLETE'
    } else if (agent.user?.emailVerified) {
      newStatus = 'EMAIL_VERIFIED'
    }

    if (agent.status !== newStatus) {
      await prisma.agent.update({
        where: { id: agent.id },
        data: { status: newStatus }
      })
      updatedAgents++
    }
  }

  console.log(`✅ Updated ${updatedAgents} agents with new unified status.`)

  // 2. Backfill Agent Subscriptions
  console.log('🔄 Backfilling Agent Subscriptions...')
  
  // Find approved agents missing a subscription
  const agentsNeedSubs = await prisma.agent.findMany({
    where: { 
      status: 'APPROVED',
      subscription: null
    }
  })

  let createdSubs = 0
  const now = new Date()
  for (const agent of agentsNeedSubs) {
    await prisma.agentSubscription.create({
      data: {
        agentId: agent.id,
        plan: 'BASIC',
        status: 'ACTIVE',
        startDate: now,
        listingsLimit: 10,
        featuredLimit: 0,
        leadPriority: 'LOW'
      }
    })
    createdSubs++
  }

  console.log(`✅ Backfilled ${createdSubs} new BASIC agent subscriptions.`)

  console.log('✨ Migration complete.')
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
