// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Knowledge Graph Service
// Phase 1: Knowledge Graph
//
// Query interface for traversing the knowledge graph.
// All reads go through this service — never query PropertyKnowledgeEdge directly.
//
// Methods:
//   getNeighbors()    — Find entities connected to a given entity
//   findPath()        — Find shortest path between two entities
//   getSimilar()      — Find similar entities
//   getImpactChain()  — Which properties are affected by an infrastructure project
//   getEntityProfile() — Full entity with all relationships
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type {
  KGEntityType,
  KGRelationshipType,
  KGEdge,
  KGEntityRef,
  KGNeighborResult,
  KGEntityProfile,
} from './schema'
import { PRISMA_EDGE_TO_KG, toKGEntityType } from './schema'

// ─── Get Neighbors ───────────────────────────────────────────────────────────
// Find all entities connected to a given entity, optionally filtered by
// relationship type and target entity type.

export async function getNeighbors(
  entityId: string,
  entityType: KGEntityType,
  options: {
    relationshipType?: KGRelationshipType
    targetType?: KGEntityType
    maxDepth?: number
    limit?: number
  } = {}
): Promise<KGNeighborResult[]> {
  const { relationshipType, targetType, limit = 50 } = options

  // Query edges where this entity is the source
  const edges = await prisma.propertyKnowledgeEdge.findMany({
    where: {
      sourceType: fromKGEntityType(entityType),
      sourceId: entityId,
      ...(relationshipType ? { edgeType: { in: getEdgeTypesForRelationship(relationshipType) as any } } : {}),
      ...(targetType ? { targetType: fromKGEntityType(targetType) } : {}),
    },
    take: limit,
    orderBy: [
      { distanceKm: 'asc' },  // Nearest first for proximity queries
      { confidence: 'desc' }, // Most confident first
    ],
  })

  return edges.map(edge => ({
    entity: {
      type: toKGEntityType(edge.targetType),
      id: edge.targetId ?? edge.id,
      name: edge.targetName ?? undefined,
    },
    edge: prismaEdgeToKGEdge(edge),
    depth: 1,
  }))
}

// ─── Get Similar Entities ────────────────────────────────────────────────────
// Find entities marked as SIMILAR_TO the given entity.

export async function getSimilar(
  entityId: string,
  entityType: KGEntityType,
  limit = 10
): Promise<KGNeighborResult[]> {
  // Check PropertySimilarityIndex for pre-computed similarities
  const similarities = await prisma.propertySimilarityIndex.findMany({
    where: { propertyId: entityId, entityType: fromKGEntityType(entityType) },
    orderBy: { similarityScore: 'desc' },
    take: limit,
  })

  return similarities.map(sim => ({
    entity: {
      type: toKGEntityType(sim.entityType),
      id: sim.comparableId,
    },
    edge: {
      relationshipType: 'SIMILAR_TO' as const,
      sourceType: toKGEntityType(sim.entityType),
      sourceId: sim.propertyId,
      targetType: toKGEntityType(sim.entityType),
      targetId: sim.comparableId,
      properties: {
        similarityScore: sim.similarityScore ?? undefined,
      },
      confidence: (sim.similarityScore ?? 0) * 100,
      computedAt: sim.computedAt?.toISOString() ?? new Date().toISOString(),
    },
    depth: 1,
  }))
}

// ─── Get Impact Chain ────────────────────────────────────────────────────────
// Given an infrastructure project, find all communities and properties it impacts.

export async function getImpactChain(
  infrastructureEntityId: string,
  options: { limit?: number } = {}
): Promise<KGNeighborResult[]> {
  const { limit = 50 } = options

  // Find all AREA_NEAR_INFRA edges pointing to this infrastructure
  const impactEdges = await prisma.propertyKnowledgeEdge.findMany({
    where: {
      OR: [
        { targetId: infrastructureEntityId, edgeType: 'AREA_NEAR_INFRA' },
        { sourceId: infrastructureEntityId, edgeType: 'AREA_NEAR_INFRA' },
      ],
    },
    take: limit,
    orderBy: { impactScore: 'desc' },
  })

  return impactEdges.map(edge => ({
    entity: {
      type: toKGEntityType(edge.sourceType),
      id: edge.sourceId,
      name: edge.targetName ?? undefined,
    },
    edge: prismaEdgeToKGEdge(edge),
    depth: 1,
  }))
}

// ─── Get Entity Profile ──────────────────────────────────────────────────────
// Full entity with all its relationships, grouped by type.

export async function getEntityProfile(
  entityId: string,
  entityType: KGEntityType
): Promise<KGEntityProfile> {
  const prismaType = fromKGEntityType(entityType)

  const [outgoingEdges, incomingEdges] = await Promise.all([
    prisma.propertyKnowledgeEdge.findMany({
      where: { sourceType: prismaType, sourceId: entityId },
      take: 100,
    }),
    prisma.propertyKnowledgeEdge.findMany({
      where: { targetType: prismaType, targetId: entityId },
      take: 100,
    }),
  ])

  const allEdges = [...outgoingEdges, ...incomingEdges]

  // Count edges by relationship type
  const edgeCounts: Record<string, number> = {}
  const connectedTypes = new Set<KGEntityType>()

  const neighbors: KGNeighborResult[] = allEdges.map(edge => {
    const relType = PRISMA_EDGE_TO_KG[edge.edgeType] ?? 'NEAR'
    edgeCounts[relType] = (edgeCounts[relType] ?? 0) + 1

    const isOutgoing = edge.sourceId === entityId
    const neighborType = isOutgoing
      ? toKGEntityType(edge.targetType)
      : toKGEntityType(edge.sourceType)

    connectedTypes.add(neighborType)

    return {
      entity: {
        type: neighborType,
        id: isOutgoing ? (edge.targetId ?? edge.id) : edge.sourceId,
        name: edge.targetName ?? undefined,
      },
      edge: prismaEdgeToKGEdge(edge),
      depth: 1,
    }
  })

  return {
    entity: { type: entityType, id: entityId },
    neighbors,
    edgeCounts: edgeCounts as Record<KGRelationshipType, number>,
    connectedEntityTypes: [...connectedTypes],
  }
}

// ─── Proximity Query ─────────────────────────────────────────────────────────
// Get all POIs within a given radius of an entity.

export async function getNearbyPOIs(
  entityId: string,
  entityType: KGEntityType,
  maxDistanceKm = 5
): Promise<KGNeighborResult[]> {
  const edges = await prisma.propertyKnowledgeEdge.findMany({
    where: {
      sourceType: fromKGEntityType(entityType),
      sourceId: entityId,
      edgeType: {
        in: [
          'PROPERTY_NEAR_METRO',
          'PROPERTY_NEAR_SCHOOL',
          'PROPERTY_NEAR_HOSPITAL',
          'PROPERTY_NEAR_MALL',
          'PROPERTY_NEAR_AIRPORT',
          'PROPERTY_NEAR_IT_HUB',
          'PROPERTY_NEAR_HIGHWAY',
        ],
      },
      distanceKm: { lte: maxDistanceKm },
    },
    orderBy: { distanceKm: 'asc' },
    take: 50,
  })

  return edges.map(edge => ({
    entity: {
      type: toKGEntityType(edge.targetType),
      id: edge.targetId ?? edge.id,
      name: edge.targetName ?? undefined,
    },
    edge: prismaEdgeToKGEdge(edge),
    depth: 1,
  }))
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function prismaEdgeToKGEdge(row: any): KGEdge {
  return {
    id: row.id,
    relationshipType: PRISMA_EDGE_TO_KG[row.edgeType] ?? 'NEAR',
    sourceType: toKGEntityType(row.sourceType),
    sourceId: row.sourceId,
    targetType: toKGEntityType(row.targetType),
    targetId: row.targetId ?? undefined,
    targetName: row.targetName ?? undefined,
    properties: {
      distanceKm: row.distanceKm ?? undefined,
      estimatedImpactPct: row.impactScore ?? undefined,
      metadata: row.properties ?? undefined,
    },
    sourceProvider: row.sourceProvider ?? undefined,
    confidence: row.confidence ?? 50,
    computedAt: row.computedAt?.toISOString() ?? new Date().toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? undefined,
  }
}

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

function getEdgeTypesForRelationship(rel: KGRelationshipType): string[] {
  const map: Record<KGRelationshipType, string[]> = {
    'NEAR':           ['PROPERTY_NEAR_METRO', 'PROPERTY_NEAR_SCHOOL', 'PROPERTY_NEAR_HOSPITAL', 'PROPERTY_NEAR_MALL', 'PROPERTY_NEAR_AIRPORT', 'PROPERTY_NEAR_IT_HUB', 'PROPERTY_NEAR_HIGHWAY'],
    'BUILT_BY':       ['PROPERTY_DEVELOPED_BY'],
    'LOCATED_IN':     [],
    'SIMILAR_TO':     [],
    'PART_OF':        ['PROPERTY_IN_PROJECT'],
    'CONNECTED_TO':   [],
    'PURCHASED_BY':   [],
    'LISTED_BY':      ['PROPERTY_LISTED_BY'],
    'REVIEWED_BY':    ['DEVELOPER_HAS_LITIGATION'],
    'IMPACTS':        ['AREA_NEAR_INFRA'],
    'COMPETES_WITH':  [],
    'TRANSACTED_AT':  ['AGENT_CLOSED_IN_AREA'],
  }
  return map[rel] ?? []
}
