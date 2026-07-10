// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Knowledge Graph Barrel Export
// Phase 1: Knowledge Graph
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Schema ──────────────────────────────────────────────────────────────────
export type {
  KGEntityType,
  KGRelationshipType,
  KGEdge,
  KGEdgeProperties,
  KGEntityRef,
  KGNeighborResult,
  KGPathResult,
  KGEntityProfile,
  SimilarityDimension,
} from './schema'

export {
  PRISMA_EDGE_TO_KG,
  toKGEntityType,
} from './schema'

// ─── Read (Query) Service ────────────────────────────────────────────────────
export {
  getNeighbors,
  getSimilar,
  getImpactChain,
  getEntityProfile,
  getNearbyPOIs,
} from './graph-service'

// ─── Write Service ───────────────────────────────────────────────────────────
export {
  writeEdge,
  writeEdges,
  writeSimilarity,
  deleteExpiredEdges,
  deleteEdgesForEntity,
} from './graph-writer'
