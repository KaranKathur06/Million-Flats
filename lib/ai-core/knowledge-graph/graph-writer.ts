// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Knowledge Graph Writer
// Phase 1: Knowledge Graph
//
// Write interface for adding/updating edges in the knowledge graph.
// Called by the ingestion pipeline, provider framework, and feature enrichment.
//
// All writes are:
//   - Idempotent (upsert by source+target+type)
//   - Timestamped
//   - Attributed to a source provider
//   - Given a confidence score
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type { KGEdge, KGEntityType, KGRelationshipType } from './schema'

// ─── Write Edge ──────────────────────────────────────────────────────────────
// Create or update a single edge in the knowledge graph.

export async function writeEdge(edge: KGEdge): Promise<string> {
  const prismaEdgeType = toDBEdgeType(edge.relationshipType, edge.targetType)
  const now = new Date()
  const expiresAt = edge.expiresAt
    ? new Date(edge.expiresAt)
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Default: 7 days

  const data = {
    edgeType: prismaEdgeType,
    sourceType: fromKGEntityType(edge.sourceType),
    sourceId: edge.sourceId,
    targetType: fromKGEntityType(edge.targetType),
    targetId: edge.targetId ?? null,
    targetName: edge.targetName ?? null,
    distanceKm: edge.properties.distanceKm ?? null,
    impactScore: edge.properties.estimatedImpactPct ?? null,
    properties: edge.properties.metadata ?? null,
    sourceProvider: edge.sourceProvider ?? null,
    confidence: edge.confidence,
    computedAt: now,
    expiresAt,
  }

  // Upsert: if edge with same source+target+type exists, update it
  const existing = await prisma.propertyKnowledgeEdge.findFirst({
    where: {
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      targetType: data.targetType,
      targetId: data.targetId,
      edgeType: data.edgeType as any,
    },
  })

  if (existing) {
    await prisma.propertyKnowledgeEdge.update({
      where: { id: existing.id },
      data: data as any,
    })
    return existing.id
  }

  const created = await prisma.propertyKnowledgeEdge.create({ data: data as any })
  return created.id
}

// ─── Write Edges (Batch) ─────────────────────────────────────────────────────
// Write multiple edges in a single transaction for pipeline efficiency.

export async function writeEdges(edges: KGEdge[]): Promise<number> {
  if (edges.length === 0) return 0

  let written = 0

  // Process in batches of 50 to avoid overwhelming the DB
  const BATCH_SIZE = 50
  for (let i = 0; i < edges.length; i += BATCH_SIZE) {
    const batch = edges.slice(i, i + BATCH_SIZE)

    await prisma.$transaction(
      batch.map(edge => {
        const prismaEdgeType = toDBEdgeType(edge.relationshipType, edge.targetType)
        const now = new Date()
        const expiresAt = edge.expiresAt
          ? new Date(edge.expiresAt)
          : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        return prisma.propertyKnowledgeEdge.create({
          data: {
            edgeType: prismaEdgeType as any,
            sourceType: fromKGEntityType(edge.sourceType),
            sourceId: edge.sourceId,
            targetType: fromKGEntityType(edge.targetType),
            targetId: edge.targetId ?? null,
            targetName: edge.targetName ?? null,
            distanceKm: edge.properties.distanceKm ?? null,
            impactScore: edge.properties.estimatedImpactPct ?? null,
            properties: edge.properties.metadata ?? null,
            sourceProvider: edge.sourceProvider ?? null,
            confidence: edge.confidence,
            computedAt: now,
            expiresAt,
          } as any,
        })
      })
    )

    written += batch.length
  }

  return written
}

// ─── Write Similarity ────────────────────────────────────────────────────────
// Record a SIMILAR_TO relationship between two entities.

export async function writeSimilarity(params: {
  entityId: string
  entityType: string
  similarEntityId: string
  similarEntityType: string
  similarityScore: number
  dimensions?: Array<{ dimension: string; score: number }>
}): Promise<void> {
  const {
    entityId,
    entityType,
    similarEntityId,
    similarEntityType,
    similarityScore,
    dimensions,
  } = params

  await prisma.propertySimilarityIndex.upsert({
    where: {
      entityType_propertyId_comparableId: {
        entityType,
        propertyId: entityId,
        comparableId: similarEntityId,
      },
    },
    create: {
      entityType,
      propertyId: entityId,
      comparableId: similarEntityId,
      similarityScore,
      matchFactors: (dimensions ?? []) as any,
      computedAt: new Date(),
    },
    update: {
      similarityScore,
      matchFactors: (dimensions ?? []) as any,
      computedAt: new Date(),
    },
  })
}

// ─── Delete Expired Edges ────────────────────────────────────────────────────
// Maintenance: remove edges past their expiry date.

export async function deleteExpiredEdges(): Promise<number> {
  const result = await prisma.propertyKnowledgeEdge.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  })
  return result.count
}

// ─── Delete Edges for Entity ─────────────────────────────────────────────────
// Remove all edges for a given entity (e.g. when property is deleted).

export async function deleteEdgesForEntity(
  entityId: string,
  entityType: KGEntityType
): Promise<number> {
  const dbType = fromKGEntityType(entityType)

  const result = await prisma.propertyKnowledgeEdge.deleteMany({
    where: {
      OR: [
        { sourceType: dbType, sourceId: entityId },
        { targetType: dbType, targetId: entityId },
      ],
    },
  })
  return result.count
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fromKGEntityType(kgType: KGEntityType): string {
  const map: Record<KGEntityType, string> = {
    'PROPERTY':       'MANUAL_PROPERTY',
    'PROJECT':        'PROJECT',
    'DEVELOPER':      'DEVELOPER',
    'AGENT':          'AGENT',
    'BUYER':          'BUYER',
    'COMMUNITY':      'COMMUNITY',
    'CITY':           'CITY',
    'METRO_STATION':  'METRO',
    'SCHOOL':         'SCHOOL',
    'HOSPITAL':       'HOSPITAL',
    'MALL':           'MALL',
    'ROAD':           'HIGHWAY',
    'AIRPORT':        'AIRPORT',
    'TRANSACTION':    'TRANSACTION',
    'DOCUMENT':       'DOCUMENT',
  }
  return map[kgType] ?? kgType
}

/**
 * Map canonical relationship type + target type to the Prisma KnowledgeEdgeType enum.
 * The Prisma enum is more specific (e.g. PROPERTY_NEAR_METRO vs PROPERTY_NEAR_SCHOOL),
 * while our KG uses a generic NEAR with target type distinction.
 */
function toDBEdgeType(rel: KGRelationshipType, targetType: KGEntityType): string {
  if (rel === 'NEAR') {
    const nearMap: Record<string, string> = {
      'METRO_STATION':  'PROPERTY_NEAR_METRO',
      'SCHOOL':         'PROPERTY_NEAR_SCHOOL',
      'HOSPITAL':       'PROPERTY_NEAR_HOSPITAL',
      'MALL':           'PROPERTY_NEAR_MALL',
      'AIRPORT':        'PROPERTY_NEAR_AIRPORT',
      'COMMUNITY':      'PROPERTY_NEAR_IT_HUB',
      'ROAD':           'PROPERTY_NEAR_HIGHWAY',
    }
    return nearMap[targetType] ?? 'PROPERTY_NEAR_METRO'
  }

  const relMap: Record<KGRelationshipType, string> = {
    'BUILT_BY':       'PROPERTY_DEVELOPED_BY',
    'LOCATED_IN':     'PROPERTY_IN_PROJECT',
    'NEAR':           'PROPERTY_NEAR_METRO',
    'SIMILAR_TO':     'PROPERTY_IN_PROJECT',
    'PART_OF':        'PROPERTY_IN_PROJECT',
    'CONNECTED_TO':   'AREA_NEAR_INFRA',
    'PURCHASED_BY':   'AGENT_CLOSED_IN_AREA',
    'LISTED_BY':      'PROPERTY_LISTED_BY',
    'REVIEWED_BY':    'DEVELOPER_HAS_LITIGATION',
    'IMPACTS':        'AREA_NEAR_INFRA',
    'COMPETES_WITH':  'PROPERTY_IN_PROJECT',
    'TRANSACTED_AT':  'AGENT_CLOSED_IN_AREA',
  }
  return relMap[rel] ?? 'PROPERTY_NEAR_METRO'
}
