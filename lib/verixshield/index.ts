// ━━━ VerixShield Price Intelligence Engine — Barrel Export ━━━━━━━━━━━━━━━

export { orchestrate } from './orchestrator'
export { runValuationEngine } from './valuation-engine'
export { runComparablesEngine } from './comparables-engine'
export { runTrendEngine } from './trend-engine'
export { runMarketSignalEngine } from './market-signal-engine'
export { runRuleEngine, computeRentalIntelligence, computePriceDistribution } from './rule-engine'
export type {
  VerixShieldResponse,
  PropertyInput,
  ValuationResult,
  ComparableProperty,
  ComparablesResult,
  TrendDataPoint,
  TrendResult,
  MarketSignalResult,
  RuleEngineResult,
  RentalIntelligence,
  PriceDistribution,
  VerixShieldStatusType,
  EntityType,
} from './types'
