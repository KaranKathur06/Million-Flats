// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Pipeline Module Barrel Export
// Phase 4: Market Intelligence Pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Ingestion Pipeline ──────────────────────────────────────────────────────
export type {
  PipelineResult,
  PipelineRecord,
  PipelineStats,
  PipelineError,
} from './ingestion-pipeline'

export {
  runPipeline,
  runListingsPipeline,
  runMarketDataPipeline,
} from './ingestion-pipeline'

// ─── Snapshot Engine ─────────────────────────────────────────────────────────
export {
  generateSnapshot,
  getOrGenerateSnapshot,
  getLatestSnapshot,
  getSnapshotHistory,
} from './snapshot-engine'
