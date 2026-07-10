// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Knowledge Graph Schema
// Phase 1: Knowledge Graph
//
// Defines the entity types, relationship types, and edge properties
// that form the intelligence layer of the platform.
//
// The knowledge graph is the connective tissue between:
//   Properties ↔ Developers ↔ Projects ↔ Locations ↔ Infrastructure ↔ Transactions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Entity Types ────────────────────────────────────────────────────────────
// 15 entity types that can participate as nodes in the knowledge graph.

export type KGEntityType =
  | 'PROPERTY'
  | 'PROJECT'
  | 'DEVELOPER'
  | 'AGENT'
  | 'BUYER'
  | 'COMMUNITY'
  | 'CITY'
  | 'METRO_STATION'
  | 'SCHOOL'
  | 'HOSPITAL'
  | 'MALL'
  | 'ROAD'
  | 'AIRPORT'
  | 'TRANSACTION'
  | 'DOCUMENT'

// ─── Relationship Types ──────────────────────────────────────────────────────
// 12 relationship types describing edges between entities.

export type KGRelationshipType =
  | 'BUILT_BY'            // Property/Project → Developer
  | 'LOCATED_IN'          // Property → Community → City
  | 'NEAR'                // Property → POI (with distance)
  | 'SIMILAR_TO'          // Property → Property (with similarity score)
  | 'PART_OF'             // Property → Project (unit within project)
  | 'CONNECTED_TO'        // Community → Community (transit link)
  | 'PURCHASED_BY'        // Transaction → Buyer
  | 'LISTED_BY'           // Property → Agent
  | 'REVIEWED_BY'         // Developer/Agent → User (review)
  | 'IMPACTS'             // Infrastructure → Community (price impact)
  | 'COMPETES_WITH'       // Project → Project (same market segment)
  | 'TRANSACTED_AT'       // Transaction → Property

// ─── Edge (Relationship Instance) ────────────────────────────────────────────

export interface KGEdge {
  id?: string                       // DB id if persisted

  // ── Relationship Type ──────────────────────────────────────────────────────
  relationshipType: KGRelationshipType

  // ── Source Node ────────────────────────────────────────────────────────────
  sourceType: KGEntityType
  sourceId: string

  // ── Target Node ────────────────────────────────────────────────────────────
  targetType: KGEntityType
  targetId?: string                 // Internal ID if entity exists in DB
  targetName?: string               // Name for external entities (e.g. metro station name)

  // ── Edge Properties ────────────────────────────────────────────────────────
  properties: KGEdgeProperties

  // ── Provenance ─────────────────────────────────────────────────────────────
  sourceProvider?: string           // Which data provider created this edge
  confidence: number                // 0-100
  computedAt: string                // ISO date
  expiresAt?: string                // ISO date — when this edge should be recomputed
}

// ─── Edge Properties ─────────────────────────────────────────────────────────
// Type-safe properties for each relationship type.

export interface KGEdgeProperties {
  // NEAR relationships
  distanceKm?: number
  walkTimeMin?: number
  driveTimeMin?: number

  // SIMILAR_TO relationships
  similarityScore?: number          // 0-1 composite
  similarityDimensions?: SimilarityDimension[]

  // BUILT_BY relationships
  year?: number
  phase?: string

  // PART_OF relationships
  unitType?: string
  tower?: string

  // CONNECTED_TO relationships
  transitTimeMin?: number

  // PURCHASED_BY / TRANSACTED_AT relationships
  price?: number
  currency?: string
  transactionDate?: string
  transactionType?: 'SALE' | 'RESALE' | 'RENTAL'

  // IMPACTS relationships
  estimatedImpactPct?: number       // Estimated price impact percentage
  timelineMonths?: number           // Expected completion timeline
  status?: string                   // APPROVED | UNDER_CONSTRUCTION | COMPLETED

  // LISTED_BY relationships
  listedAt?: string
  listingStatus?: string

  // REVIEWED_BY relationships
  rating?: number
  sentiment?: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'

  // COMPETES_WITH relationships
  overlapDimensions?: string[]      // ["location", "price_range", "bedroom_config"]
  competitionScore?: number         // 0-100

  // Generic metadata bucket
  metadata?: Record<string, unknown>
}

// ─── Similarity Dimension ────────────────────────────────────────────────────

export interface SimilarityDimension {
  dimension: string                 // "location", "area", "price", "developer", etc.
  score: number                     // 0-1 similarity score for this dimension
  weight: number                    // How much this dimension contributes to overall
}

// ─── Entity Reference ────────────────────────────────────────────────────────
// Lightweight reference to a graph entity.

export interface KGEntityRef {
  type: KGEntityType
  id: string
  name?: string
}

// ─── Traversal Results ───────────────────────────────────────────────────────

export interface KGNeighborResult {
  entity: KGEntityRef
  edge: KGEdge
  depth: number                     // How many hops from the source
}

export interface KGPathResult {
  from: KGEntityRef
  to: KGEntityRef
  path: KGEdge[]                    // Ordered list of edges forming the path
  totalDistance?: number             // Sum of distanceKm across path
}

export interface KGEntityProfile {
  entity: KGEntityRef
  neighbors: KGNeighborResult[]
  edgeCounts: Record<KGRelationshipType, number>
  connectedEntityTypes: KGEntityType[]
}

// ─── Mapping: Prisma KnowledgeEdgeType → KGRelationshipType ──────────────────
// Maps existing Prisma enum values to the new canonical relationship types.

export const PRISMA_EDGE_TO_KG: Record<string, KGRelationshipType> = {
  'PROPERTY_NEAR_METRO':      'NEAR',
  'PROPERTY_NEAR_SCHOOL':     'NEAR',
  'PROPERTY_NEAR_HOSPITAL':   'NEAR',
  'PROPERTY_NEAR_MALL':       'NEAR',
  'PROPERTY_NEAR_AIRPORT':    'NEAR',
  'PROPERTY_NEAR_IT_HUB':     'NEAR',
  'PROPERTY_NEAR_HIGHWAY':    'NEAR',
  'PROPERTY_DEVELOPED_BY':    'BUILT_BY',
  'PROPERTY_LISTED_BY':       'LISTED_BY',
  'PROPERTY_IN_PROJECT':      'PART_OF',
  'DEVELOPER_HAS_LITIGATION': 'REVIEWED_BY', // Mapped to closest semantic match
  'AGENT_CLOSED_IN_AREA':     'TRANSACTED_AT',
  'AREA_NEAR_INFRA':          'IMPACTS',
} as const

// ─── Mapping: Prisma targetType → KGEntityType ──────────────────────────────

export function toKGEntityType(prismaType: string): KGEntityType {
  const map: Record<string, KGEntityType> = {
    'MANUAL_PROPERTY':  'PROPERTY',
    'PROJECT':          'PROJECT',
    'DEVELOPER':        'DEVELOPER',
    'AGENT':            'AGENT',
    'INFRASTRUCTURE':   'ROAD',        // Default for infra
    'SCHOOL':           'SCHOOL',
    'HOSPITAL':         'HOSPITAL',
    'METRO':            'METRO_STATION',
    'METRO_STATION':    'METRO_STATION',
    'MALL':             'MALL',
    'AIRPORT':          'AIRPORT',
    'HIGHWAY':          'ROAD',
    'IT_HUB':           'COMMUNITY',   // IT hubs are area-level entities
  }
  return map[prismaType] ?? 'COMMUNITY'
}
