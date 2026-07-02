// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Public API Index
// All AI platform exports go through this single entry point.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  EntityType,
  AIModule,
  MarketHeat,
  InvestmentGrade,
  LegalRiskLevel,
  ValuationReport,
  InvestmentIntelligence,
  MediaIntelligenceReport,
  LegalDocumentIntelligenceReport,
  AgentIntelligenceReport,
  PropertyIntelligenceBundle,
  ConfidenceResult,
  RiskScore,
  RiskFactor,
  Comparable,
  PricePoint,
  FeatureImportance,
  NormalizedPOI,
  NormalizedMarketTransaction,
  PlatformEvent,
  PlatformEventType,
} from './types'

// ── Orchestrator (PRIMARY ENTRY POINT) ────────────────────────────────────────
export {
  orchestrateProperty,
  orchestrateAgent,
  getValuationReport,
  getInvestmentReport,
  analyzeMedia,
  analyzeDocument,
  triggerAIOnEvent,
} from './orchestrator'

// ── Feature Store ─────────────────────────────────────────────────────────────
export { getFeatureVector } from './feature-store'
export type { FeatureVector } from './feature-store'

// ── Confidence Engine ─────────────────────────────────────────────────────────
export {
  computeConfidence,
  hasMinimumConfidence,
  confidenceLabel,
} from './confidence'

// ── Market Intelligence ───────────────────────────────────────────────────────
export { getMarketReport } from './engines/market'
export type { MarketReport } from './engines/market'

// ── Data Providers ────────────────────────────────────────────────────────────
export { fetchGoogleMapsPOIs, writePOIsToKnowledgeGraph } from './providers/google-maps-poi'
