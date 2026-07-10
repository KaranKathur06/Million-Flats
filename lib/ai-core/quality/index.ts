// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Quality Module Barrel Export
// Phase 3: Data Quality Engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type { DataQualityScore, QualityFactor } from './data-quality-engine'
export {
  assessDataQuality,
  assessPropertyQuality,
  assessMarketDataQuality,
} from './data-quality-engine'

export type { AnomalyResult, Anomaly, AnomalyType } from './anomaly-detector'
export {
  detectPriceAnomaly,
  detectAreaAnomalies,
  detectTemporalAnomalies,
  detectAllAnomalies,
} from './anomaly-detector'
