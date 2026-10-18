import { prisma } from '@/lib/prisma'
import { extractRelativeKey } from '@/lib/assetUrl'

type LifecycleResult =
  | { ok: true; agentId: string; archivedPropertyCount?: number; partial?: boolean; cleanupJobId?: string | null }
  | { ok: false; status: 403 | 404 | 409; message: string; dependencies?: Array<{ category: string; count: number }> }

type ForeignKeyReference = {
  schemaName: string
  parentSchemaName: string
  tableName: string
  childColumns: string[]
  parentColumns: string[]
  parentTable: 'agents' | 'users'
}

class AgentPurgeDependencyConflict extends Error {
  constructor(readonly dependencies: Array<{ category: string; count: number }>) {
    super('Agent acquired protected linked records and cannot be permanently deleted')
  }
}

const disposableAgentDependencies = new Set([
  'agent_ai_intelligence',
  'agent_badges',
  'agent_documents',
  'agent_metrics',
  'agent_service_areas',
  'agent_specializations',
  'agent_verification_progress',
  'featured_agent_clicks',
])

const disposableUserDependencies = new Set([
  'accounts',
  'email_verification_tokens',
  'password_reset_tokens',
  'sessions',
  'user_preferences',
])

const dependencyCategories: Record<string, string> = {
  agent_listings: 'Agent listings',
  agent_payments: 'Payments and subscriptions',
  agent_reviews: 'Reviews',
  agent_subscriptions: 'Payments and subscriptions',
  agent_verifications: 'Verification and compliance history',
  audit_logs: 'Security and audit history',
  inquiries: 'Inquiries',
  leads: 'Leads',
  login_audits: 'Security and audit history',
  manual_properties: 'Manual properties',
  moderation_actions: 'Security and audit history',
  moderation_cases: 'Security and audit history',
  moderation_messages: 'Security and audit history',
  payments: 'Payments and subscriptions',
  property_leads: 'Leads',
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`
}

async function lockRows(tx: any, agentId: string) {
  const agentRows = await tx.$queryRawUnsafe(
    'SELECT "id" FROM "agents" WHERE "id" = $1 FOR UPDATE',
    agentId,
  )
  if (!agentRows.length) return null

  const userRows = await tx.$queryRawUnsafe(
    'SELECT "id" FROM "users" WHERE "id" = (SELECT "user_id" FROM "agents" WHERE "id" = $1) FOR UPDATE',
    agentId,
  )
  if (!userRows.length) return null

  return tx.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      userId: true,
      approved: true,
      archivedAt: true,
      archivedBy: true,
      archivePriorUserStatus: true,
      archivePriorApproved: true,
      archiveSecurityVersion: true,
      user: { select: { role: true, status: true, securityStateVersion: true } },
    },
  })
}

async function listForeignKeyReferences(tx: any): Promise<ForeignKeyReference[]> {
  return tx.$queryRaw`
    SELECT DISTINCT
      child_namespace.nspname AS "schemaName",
      parent_namespace.nspname AS "parentSchemaName",
      child_table.relname AS "tableName",
      child_table.relname AS "tableName",
      parent_table.relname AS "parentTable",
      array_agg(child_column.attname ORDER BY child_key.key_order) AS "childColumns",
      array_agg(parent_column.attname ORDER BY parent_key.key_order) AS "parentColumns"
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS child_table ON child_table.oid = constraint_row.conrelid
    JOIN pg_namespace AS child_namespace ON child_namespace.oid = child_table.relnamespace
    JOIN pg_class AS parent_table ON parent_table.oid = constraint_row.confrelid
    JOIN pg_namespace AS parent_namespace ON parent_namespace.oid = parent_table.relnamespace
    JOIN unnest(constraint_row.conkey) WITH ORDINALITY AS child_key(attnum, key_order) ON true
    JOIN unnest(constraint_row.confkey) WITH ORDINALITY AS parent_key(attnum, key_order)
      ON parent_key.key_order = child_key.key_order
    JOIN pg_attribute AS child_column
      ON child_column.attrelid = child_table.oid AND child_column.attnum = child_key.attnum
    JOIN pg_attribute AS parent_column
      ON parent_column.attrelid = parent_table.oid AND parent_column.attnum = parent_key.attnum
    WHERE constraint_row.contype = 'f'
      AND parent_namespace.nspname = current_schema()
      AND parent_table.relname IN ('agents', 'users')
    GROUP BY child_namespace.nspname, parent_namespace.nspname, child_table.relname, parent_table.relname
  `
}

async function getProtectedDependencies(tx: any, agentId: string, userId: string) {
  const references = await listForeignKeyReferences(tx)
  const counts = new Map<string, number>()

  for (const reference of references) {
    const allowed = reference.parentTable === 'agents'
      ? disposableAgentDependencies.has(reference.tableName)
      : disposableUserDependencies.has(reference.tableName) || reference.tableName === 'agents'
    if (allowed) continue

    const childRelation = `${quoteIdentifier(reference.schemaName)}.${quoteIdentifier(reference.tableName)}`
    const parentRelation = `${quoteIdentifier(reference.parentSchemaName)}.${quoteIdentifier(reference.parentTable)}`
    const joinColumns = reference.childColumns
      .map((childColumn, index) => `child.${quoteIdentifier(childColumn)} = parent.${quoteIdentifier(reference.parentColumns[index])}`)
      .join(' AND ')
    const selfReferenceGuard = reference.tableName === reference.parentTable
      ? ' AND child."id" <> parent."id"'
      : ''
    const targetId = reference.parentTable === 'agents' ? agentId : userId
    const rows = await tx.$queryRawUnsafe(
      `SELECT count(*)::int AS "count" FROM ${childRelation} AS child JOIN ${parentRelation} AS parent ON ${joinColumns} WHERE parent."id" = $1${selfReferenceGuard}`,
      targetId,
    )
    const count = Number(rows[0]?.count || 0)
    if (!count) continue

    const category = dependencyCategories[reference.tableName] || 'Linked business history'
    counts.set(category, (counts.get(category) || 0) + count)
  }

  return Array.from(counts, ([category, count]) => ({ category, count }))
}

async function createAudit(
  tx: any,
  input: {
    agentId: string
    actorUserId: string
    action: 'ADMIN_ARCHIVED' | 'ADMIN_RESTORED' | 'ADMIN_AGENT_DELETED'
    beforeState: unknown
    afterState: unknown
    meta?: unknown
  },
) {
  await tx.auditLog.create({
    data: {
      entityType: 'AGENT',
      entityId: input.agentId,
      action: input.action,
      performedByUserId: input.actorUserId,
      beforeState: input.beforeState,
      afterState: input.afterState,
      meta: input.meta ?? null,
    },
  })
}

export async function archiveAgent(agentId: string, actorUserId: string): Promise<LifecycleResult> {
  const id = String(agentId || '').trim()
  if (!id) return { ok: false, status: 404, message: 'Agent not found' }

  return (prisma as any).$transaction(async (tx: any) => {
    const agent = await lockRows(tx, id)
    if (!agent) return { ok: false as const, status: 404, message: 'Agent not found' }
    if (agent.archivedAt) return { ok: false as const, status: 409, message: 'Agent is already archived' }
    if (['ADMIN', 'SUPERADMIN'].includes(String(agent.user.role).toUpperCase())) {
      return { ok: false as const, status: 403, message: 'Cannot archive an administrator' }
    }

    const archivedAt = new Date()
    const nextSecurityVersion = Number(agent.user.securityStateVersion || 0) + 1
    const propertyResult = await tx.manualProperty.updateMany({
      where: { agentId: id, sourceType: 'MANUAL', status: 'PUBLISHED' },
      data: {
        status: 'ARCHIVED',
        archivedAt,
        archivedBy: actorUserId,
        archivedByAgentAt: archivedAt,
        archivedByAgentActorId: actorUserId,
      },
    })
    await tx.user.update({
      where: { id: agent.userId },
      data: { status: 'SUSPENDED', securityStateVersion: { increment: 1 } },
    })
    await tx.agent.update({
      where: { id },
      data: {
        approved: false,
        archivedAt,
        archivedBy: actorUserId,
        archivePriorUserStatus: agent.user.status,
        archivePriorApproved: agent.approved,
        archiveSecurityVersion: nextSecurityVersion,
      },
    })

    await createAudit(tx, {
      agentId: id,
      actorUserId,
      action: 'ADMIN_ARCHIVED',
      beforeState: {
        approved: agent.approved,
        userStatus: agent.user.status,
        securityStateVersion: agent.user.securityStateVersion,
      },
      afterState: {
        archived: true,
        userStatus: 'SUSPENDED',
        securityStateVersion: nextSecurityVersion,
        archivedPropertyCount: propertyResult.count,
      },
      meta: { operation: 'agent_archive' },
    })

    return { ok: true as const, agentId: id, archivedPropertyCount: propertyResult.count }
  }, { isolationLevel: 'Serializable' })
}

export async function restoreAgent(agentId: string, actorUserId: string): Promise<LifecycleResult> {
  const id = String(agentId || '').trim()
  if (!id) return { ok: false, status: 404, message: 'Agent not found' }

  return (prisma as any).$transaction(async (tx: any) => {
    const agent = await lockRows(tx, id)
    if (!agent) return { ok: false as const, status: 404, message: 'Agent not found' }
    if (!agent.archivedAt || !agent.archivedBy || !agent.archivePriorUserStatus) {
      return { ok: false as const, status: 409, message: 'Agent is not archived' }
    }

    const securityStateMatches =
      agent.user.status === 'SUSPENDED' &&
      Number(agent.user.securityStateVersion) === Number(agent.archiveSecurityVersion)

    if (!securityStateMatches) {
      await createAudit(tx, {
        agentId: id,
        actorUserId,
        action: 'ADMIN_RESTORED',
        beforeState: {
          archived: true,
          userStatus: agent.user.status,
          securityStateVersion: agent.user.securityStateVersion,
        },
        afterState: {
          archived: true,
          partial: true,
          restoredPropertyCount: 0,
        },
        meta: { operation: 'agent_restore', requiresAdminReview: true },
      })
      return {
        ok: true as const,
        agentId: id,
        archivedPropertyCount: 0,
        partial: true,
      }
    }

    const restoredAt = agent.archivedAt
    const archiveActorId = agent.archivedBy
    const propertyResult = await tx.manualProperty.updateMany({
      where: {
        agentId: id,
        sourceType: 'MANUAL',
        status: 'ARCHIVED',
        archivedByAgentAt: restoredAt,
        archivedByAgentActorId: archiveActorId,
      },
      data: {
        status: 'PUBLISHED',
        archivedAt: null,
        archivedBy: null,
        archivedByAgentAt: null,
        archivedByAgentActorId: null,
      },
    })

    await tx.user.update({
      where: { id: agent.userId },
      data: {
        status: agent.archivePriorUserStatus,
        securityStateVersion: { increment: 1 },
      },
    })
    await tx.agent.update({
      where: { id },
      data: {
        approved: agent.archivePriorApproved ?? agent.approved,
        archivedAt: null,
        archivedBy: null,
        archivePriorUserStatus: null,
        archivePriorApproved: null,
        archiveSecurityVersion: null,
      },
    })

    await createAudit(tx, {
      agentId: id,
      actorUserId,
      action: 'ADMIN_RESTORED',
      beforeState: { archived: true, userStatus: 'SUSPENDED' },
      afterState: {
        archived: false,
        userStatus: agent.archivePriorUserStatus,
        restoredPropertyCount: propertyResult.count,
      },
      meta: { operation: 'agent_restore' },
    })

    return { ok: true as const, agentId: id, archivedPropertyCount: propertyResult.count }
  }, { isolationLevel: 'Serializable' })
}

export async function permanentlyDeleteAgent(
  agentId: string,
  actorUserId: string,
): Promise<LifecycleResult> {
  const id = String(agentId || '').trim()
  if (!id) return { ok: false, status: 404, message: 'Agent not found' }

  try {
    return await (prisma as any).$transaction(async (tx: any) => {
    const agent = await lockRows(tx, id)
    if (!agent) return { ok: false as const, status: 404, message: 'Agent not found' }
    if (['ADMIN', 'SUPERADMIN'].includes(String(agent.user.role).toUpperCase())) {
      return { ok: false as const, status: 403, message: 'Cannot permanently delete an administrator' }
    }

    const dependencies = await getProtectedDependencies(tx, id, agent.userId)
    if (dependencies.length) {
      return {
        ok: false as const,
        status: 409,
        message: 'Agent has protected linked records and cannot be permanently deleted',
        dependencies,
      }
    }

    const documents = await tx.agentDocument.findMany({
      where: { agentId: id },
      select: { s3Key: true, fileUrl: true },
    })
    const cleanupItems = Array.from(new Set(
      documents
        .map((document: { s3Key: string | null; fileUrl: string }) => {
          const key = document.s3Key || extractRelativeKey(document.fileUrl)
          return key?.startsWith('private/') ? key : null
        })
        .filter((key: string | null): key is string => Boolean(key)),
    )).map((key) => ({ type: 'key', key }))

    const cleanupJob = cleanupItems.length
      ? await tx.storageCleanupJob.create({ data: { storageItems: cleanupItems } })
      : null

    await createAudit(tx, {
      agentId: id,
      actorUserId,
      action: 'ADMIN_AGENT_DELETED',
      beforeState: { archived: Boolean(agent.archivedAt) },
      afterState: { deleted: true },
      meta: {
        mode: 'permanent',
        queuedDocumentObjectCount: cleanupItems.length,
        cleanupJobId: cleanupJob?.id || null,
      },
    })

    const dependenciesAtDelete = await getProtectedDependencies(tx, id, agent.userId)
    if (dependenciesAtDelete.length) {
      throw new AgentPurgeDependencyConflict(dependenciesAtDelete)
    }

    await tx.agent.delete({ where: { id } })
    await tx.user.delete({ where: { id: agent.userId } })

    return {
      ok: true as const,
      agentId: id,
      cleanupJobId: cleanupJob?.id || null,
    }
    }, { isolationLevel: 'Serializable' })
  } catch (error) {
    if (error instanceof AgentPurgeDependencyConflict) {
      return {
        ok: false,
        status: 409,
        message: error.message,
        dependencies: error.dependencies,
      }
    }
    throw error
  }
}
