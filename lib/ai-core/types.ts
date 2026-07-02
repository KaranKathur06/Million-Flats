// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Shared Type Definitions
// Volume 3: AI/ML Pipeline — Type Contracts
//
// Every AI engine in the platform consumes and produces these types.
// Never import from individual engine files — always import from here.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Core Primitives ──────────────────────────────────────────────────────────

export type EntityType = 'MANUAL_PROPERTY' | 'PROJECT'

export type AIModule = 'SHIELD' | 'INDEX' | 'VIEW' | 'TITLE' | 'PRO' | 'MARKET' | 'RISK' | 'RECOMMEND'

export type MarketHeat = 'VERY_HOT' | 'HOT' | 'WARM' | 'NEUTRAL' | 'COOL' | 'COLD' | 'VERY_COLD'

export type InvestmentGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D'

export type LegalRiskLevel = 'CLEAR' | 'MINOR_ISSUES' | 'CAUTION' | 'HIGH_RISK' | 'BLOCKED'

export type ImpactDirection = 'positive' | 'negative' | 'neutral'

// ─── Confidence Engine Output ─────────────────────────────────────────────────

export interface ConfidenceFactor {
  name: string
  score: number       // 0-100
  weight: number      // contribution weight
  weighted: number    // score * weight
  reason: string      // plain-English explanation
}

export interface ConfidenceResult {
  score: number       // 0-100 composite
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  factors: ConfidenceFactor[]
  dataPointsUsed: number
  lastDataUpdate: string  // ISO date string
  reasons: string[]       // top reasons for confidence level
}

// ─── Explainability Engine Output ─────────────────────────────────────────────

export interface FeatureImportance {
  feature: string         // "distance_metro_km"
  displayName: string     // "Distance to Metro"
  value: string           // "1.2 km"
  shapValue: number       // SHAP-style impact value
  impactPct: number       // % impact on prediction (+/-)
  direction: ImpactDirection
}

export interface ExplainabilityResult {
  summary: string                   // plain-English: "This property is priced 12% above..."
  topFactors: FeatureImportance[]   // top 5-10 factors
  methodology: string               // "Comparable-based AVM with 126 sales datapoints"
  disclaimer: string
  reasoning: string                 // full narrative
}

// ─── Risk Engine Output ───────────────────────────────────────────────────────

export interface RiskFactor {
  category: string    // "LEGAL" | "MARKET" | "DEVELOPER" | "STRUCTURAL" | "FINANCIAL"
  name: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  mitigation?: string
}

export interface RiskScore {
  overall: number           // 0-100 (lower = safer)
  legalRisk: number         // 0-100
  marketRisk: number        // 0-100
  developerRisk: number     // 0-100
  liquidityRisk: number     // 0-100
  mediaRisk: number         // 0-100
  factors: RiskFactor[]
  riskLabel: 'VERY_LOW' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH'
}

// ─── AIShield — Property Valuation Report ─────────────────────────────────────

export interface Comparable {
  entityId: string
  title: string
  price: number
  pricePerSqft: number
  sqft: number
  bedrooms: number
  city: string
  community?: string
  distanceKm?: number
  similarityScore: number   // 0-1
  source: string            // "PLATFORM" | "MARKET_DATA"
  saleDate?: string
}

export interface PricePoint {
  period: string            // "2024-Q1"
  avgPricePerSqft: number
  medianPrice: number
  transactionCount: number
  priceChangePercent?: number
}

export interface ValuationReport {
  entityId: string
  entityType: EntityType
  
  // ── Fair Value ────────────────────────────────────────────────────────────
  fairValue: {
    min: number
    mid: number
    max: number
    currency: string
  }
  
  // ── Confidence ────────────────────────────────────────────────────────────
  confidence: ConfidenceResult
  
  // ── Market Position ───────────────────────────────────────────────────────
  askingPrice: number | null
  marketPosition: 'UNDERPRICED' | 'FAIR' | 'SLIGHTLY_OVERPRICED' | 'OVERPRICED' | 'PREMIUM'
  deviationPercent: number      // asking vs fair value
  pricePosition: number         // 0-100 percentile in market
  
  // ── Negotiation Intelligence ──────────────────────────────────────────────
  negotiationRange: {
    floor: number
    ceiling: number
    recommendedOffer: number
    strategy: string            // "Buyer advantage — offer 5-8% below asking"
  }
  sellerAdvantage: number       // 0-100
  buyerAdvantage: number        // 0-100
  
  // ── Market Intelligence ───────────────────────────────────────────────────
  marketHeat: MarketHeat
  liquidityScore: number        // 0-100
  
  // ── Comparables ───────────────────────────────────────────────────────────
  comparables: Comparable[]
  comparablesStats: {
    count: number
    avgPricePerSqft: number
    medianPrice: number
    weightedAvgPricePerSqft: number
  }
  
  // ── Price Timeline ────────────────────────────────────────────────────────
  priceTimeline: PricePoint[]
  priceVolatility: number
  trendDirection: 'up' | 'down' | 'stable'
  trendOverallChangePercent: number
  
  // ── Future Projection ─────────────────────────────────────────────────────
  futureProjection: {
    months12: number
    months24: number
    months36: number
    cagrPercent: number
    scenarioBull: number
    scenarioBase: number
    scenarioBear: number
  }
  
  // ── Risk & Explainability ─────────────────────────────────────────────────
  riskScore: RiskScore
  priceDrivers: FeatureImportance[]
  hiddenRisks: RiskFactor[]
  explainability: ExplainabilityResult
  
  // ── Meta ──────────────────────────────────────────────────────────────────
  modelVersion: string
  modelName: string
  computedAt: string
  expiresAt: string
  cacheHit: boolean
  processingMs?: number
}

// ─── AIIndex — Investment Intelligence Report ─────────────────────────────────

export interface GradeDetail {
  grade: InvestmentGrade
  score: number           // 0-100
  label: string           // "Excellent" | "Good" | "Average" | "Poor"
  reasoning: string
}

export interface CAGRProjection {
  conservative: number    // % CAGR
  base: number
  optimistic: number
  years: number
}

export interface InvestmentIntelligence {
  entityId: string
  entityType: EntityType
  
  // ── Overall Investment Grade ──────────────────────────────────────────────
  overallGrade: GradeDetail
  opportunityScore: number    // 0-100 (higher = better opportunity right now)
  
  // ── Component Grades (15 dimensions) ─────────────────────────────────────
  rentalGrade: GradeDetail
  growthGrade: GradeDetail
  liquidityGrade: GradeDetail
  infrastructureGrade: GradeDetail
  demandGrade: GradeDetail
  developerGrade: GradeDetail
  neighborhoodGrade: GradeDetail
  futureRiskGrade: GradeDetail
  legalGrade: GradeDetail
  
  // ── Financial Projections ─────────────────────────────────────────────────
  projectedCAGR: CAGRProjection
  cashflowScore: number       // 0-100 (rental cashflow quality)
  rentalYield: number         // % annual
  rentalOccupancy: number     // % expected occupancy
  vacancyRisk: 'LOW' | 'MEDIUM' | 'HIGH'
  capitalAppreciation: number // % 5-year
  inflationAdjustedReturn: number  // % real return
  
  // ── Strategy ──────────────────────────────────────────────────────────────
  exitPotential: 'EXCELLENT' | 'GOOD' | 'MODERATE' | 'POOR'
  bestHoldingPeriod: {
    years: number
    reasoning: string
  }
  investmentStrategy: 'BUY_AND_HOLD' | 'RENTAL_INCOME' | 'FLIP' | 'NOT_RECOMMENDED'
  strategyReasoning: string
  
  // ── Infrastructure Impact ─────────────────────────────────────────────────
  nearbyInfrastructure: {
    name: string
    type: string
    status: string
    estimatedPriceImpactPct: number
    timelineMonths?: number
  }[]
  
  // ── Explainability ────────────────────────────────────────────────────────
  topInvestmentFactors: FeatureImportance[]
  keyRisks: RiskFactor[]
  
  // ── Meta ──────────────────────────────────────────────────────────────────
  confidence: ConfidenceResult
  modelVersion: string
  computedAt: string
  expiresAt: string
  cacheHit: boolean
}

// ─── AIView — Media Intelligence Report ──────────────────────────────────────

export interface MediaItemAnalysis {
  url: string
  mediaType: 'IMAGE' | 'VIDEO' | '3D_TOUR' | 'FLOOR_PLAN'
  roomType?: string
  
  // Authenticity
  isAiGenerated: boolean
  isManipulated: boolean
  manipulationScore: number    // 0-100 (0=authentic)
  isBlurry: boolean
  hasLightingIssues: boolean
  
  // Defects
  hasDefects: boolean
  defectsDetected: {
    type: string
    confidence: number
    description: string
  }[]
  
  // Duplicate
  isDuplicate: boolean
  duplicateOf?: string
  
  // Quality
  qualityScore: number         // 0-100
  trustScore: number           // 0-100
  
  // Classification
  estimatedSqft?: number
  isVirtualStaged: boolean
}

export interface MediaIntelligenceReport {
  entityId: string
  entityType: EntityType
  
  mediaTrustScore: number       // 0-100 composite
  overallQualityScore: number   // 0-100
  tourCompletenessScore?: number
  
  totalImages: number
  flaggedImages: number
  duplicateImages: number
  defectImages: number
  aiGeneratedImages: number
  
  items: MediaItemAnalysis[]
  
  // Recommendations
  flags: string[]              // ["2 images appear AI-generated", "Possible water damage visible"]
  recommendations: string[]   // ["Remove duplicate images", "Add kitchen photos"]
  
  // Meta
  modelUsed: string
  modelVersion: string
  analyzedAt: string
  processingMs?: number
}

// ─── AITitle — Legal Document Intelligence Report ─────────────────────────────

export interface OwnershipRecord {
  ownerName: string
  ownerType: 'INDIVIDUAL' | 'COMPANY' | 'TRUST'
  fromDate?: string
  toDate?: string
  transferType?: string    // "SALE" | "INHERITANCE" | "GIFT" | "COURT_ORDER"
  documentRef?: string
}

export interface LegalDocumentIntelligenceReport {
  entityId: string
  entityType: EntityType
  
  // ── Document Inventory ────────────────────────────────────────────────────
  documentsAnalyzed: number
  documentTypes: string[]
  missingDocuments: string[]   // what's absent but should be present
  
  // ── Ownership ────────────────────────────────────────────────────────────
  currentOwner?: string
  ownershipChain: OwnershipRecord[]
  ownershipType?: string        // "FREEHOLD" | "LEASEHOLD"
  
  // ── Legal Health ──────────────────────────────────────────────────────────
  legalHealthScore: number      // 0-100
  documentCompletenessScore: number  // 0-100
  riskClassification: LegalRiskLevel
  timelineConsistency: 'CONSISTENT' | 'GAPS' | 'CONTRADICTIONS'
  
  // ── Key Findings ──────────────────────────────────────────────────────────
  redFlags: {
    flag: string
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    description: string
    documentRef?: string
  }[]
  
  litigationRecords: {
    court: string
    caseNumber: string
    status: string
    parties: string[]
    filedDate?: string
  }[]
  
  // ── Extracted Data ────────────────────────────────────────────────────────
  extractedData: Record<string, string | number | boolean | null>
  reraNumber?: string
  reraCompletionPct?: number
  
  // ── Recommendations ───────────────────────────────────────────────────────
  recommendations: string[]    // "Obtain Occupancy Certificate", "Verify RERA registration"
  
  // ── Meta ──────────────────────────────────────────────────────────────────
  ocrEngine: string
  ocrConfidence: number
  modelVersion: string
  analyzedAt: string
  processingMs?: number
}

// ─── AIPro — Agent Intelligence Report ───────────────────────────────────────

export interface AgentPerformanceMetrics {
  performanceScore: number      // 0-100 composite
  dealsClosed90Days: number
  leadConversionRate: number    // %
  avgResponseTimeHrs: number
  avgDealSizeAed: number
  revenueEstimate90Days: number
  clientRetentionRate: number   // %
  saleToListRatio?: number
}

export interface AgentIntelligenceReport {
  agentId: string
  
  // ── Performance ───────────────────────────────────────────────────────────
  performance: AgentPerformanceMetrics
  
  // ── Behavior Predictions ──────────────────────────────────────────────────
  predictions: {
    churnProbability: number       // 0-1
    renewalProbability: number     // 0-1
    upsellProbability: number      // 0-1
    nextDealProbability: number    // 0-1 (close deal this month)
    bestLeadResponseWindow: string // "Tuesday 10AM-12PM"
  }
  
  // ── Lead Intelligence ──────────────────────────────────────────────────────
  leadIntelligence: {
    optimalLeadCount: number       // leads/month for peak performance
    leadQualityScore: number       // avg quality of leads handled
    leadRoutingScore: number       // how well new leads match this agent
    specialties: string[]          // areas/property types they excel in
  }
  
  // ── Fraud Risk ────────────────────────────────────────────────────────────
  fraudRiskScore: number           // 0-100
  fraudRiskReasons: string[]
  
  // ── Sentiment ─────────────────────────────────────────────────────────────
  sentiment: {
    score: number                  // -1 to +1
    label: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'
    topThemes: string[]            // ["fast response", "knows area well"]
    sampleReviews: string[]
  }
  
  // ── AI Coaching ───────────────────────────────────────────────────────────
  coaching: {
    recommendations: string[]
    strengths: string[]
    improvements: string[]
    priorityAction: string         // single most impactful next action
  }
  
  // ── Badge Eligibility ──────────────────────────────────────────────────────
  badges: {
    badge: string
    eligible: boolean
    currentValue: number
    threshold: number
    reason: string
  }[]
  
  // ── Meta ──────────────────────────────────────────────────────────────────
  modelVersion: string
  computedAt: string
  expiresAt: string
}

// ─── Master AI Orchestrator — Unified Property Intelligence ───────────────────

export interface PropertyIntelligenceBundle {
  entityId: string
  entityType: EntityType
  
  shield?: ValuationReport
  index?: InvestmentIntelligence
  view?: MediaIntelligenceReport
  title?: LegalDocumentIntelligenceReport
  
  // ── Composite Scores ──────────────────────────────────────────────────────
  overallAiScore: number         // 0-100 composite of all engines
  trustScore: number             // 0-100 overall trustworthiness of listing
  
  computedAt: string
  enginesRun: AIModule[]
}

// ─── Feature Vector Input (for ML models) ────────────────────────────────────

export interface PropertyFeatureInput {
  entityId: string
  entityType: EntityType
  
  // Core identifiers
  city: string
  community?: string
  countryIso2: string
  
  // Physical
  sqft?: number
  bedrooms?: number
  bathrooms?: number
  floor?: number
  totalFloors?: number
  propertyType?: string
  furnishingStatus?: string
  amenityCount?: number
  constructionYear?: number
  
  // Financial
  askingPrice?: number
  currency?: string
  
  // Location
  latitude?: number
  longitude?: number
  
  // Developer
  developerName?: string
  developerId?: string
  
  // Timestamps
  createdAt?: Date
}

// ─── API Request/Response Contracts ──────────────────────────────────────────

export interface AIValuationRequest {
  entityId: string
  entityType: EntityType
  forceRefresh?: boolean
}

export interface AIInvestmentRequest {
  entityId: string
  entityType: EntityType
  forceRefresh?: boolean
}

export interface AIVisionRequest {
  entityId: string
  entityType: EntityType
  imageUrls: string[]
  forceRefresh?: boolean
}

export interface AILegalRequest {
  entityId: string
  entityType: EntityType
  documentUrl: string
  documentType: string
}

export interface AIAgentRequest {
  agentId: string
  forceRefresh?: boolean
}

// ─── Event Types (Event-Driven Architecture) ──────────────────────────────────

export type PlatformEventType =
  | 'PROPERTY_CREATED'
  | 'PROPERTY_UPDATED'
  | 'PROPERTY_PRICE_CHANGED'
  | 'IMAGE_UPLOADED'
  | 'DOCUMENT_UPLOADED'
  | 'AGENT_VERIFIED'
  | 'LEAD_CREATED'
  | 'TRANSACTION_CLOSED'
  | 'REVIEW_ADDED'
  | 'INFRASTRUCTURE_UPDATED'
  | 'MARKET_SNAPSHOT_UPDATED'
  | 'MODEL_RETRAINED'
  | 'AGENT_METRICS_UPDATED'

export interface PlatformEvent<T = Record<string, unknown>> {
  type: PlatformEventType
  entityId: string
  entityType?: string
  payload: T
  triggeredBy: string        // userId | "system" | "worker" | "cron"
  timestamp: string
}

// ─── Data Provider Contract ───────────────────────────────────────────────────

export interface ProviderResult<T> {
  success: boolean
  data: T | null
  error?: string
  source: string             // provider name
  fetchedAt: string
  latencyMs: number
  recordCount?: number
}

export interface NormalizedPOI {
  name: string
  type: string               // "METRO_STATION" | "SCHOOL" | "HOSPITAL"
  latitude: number
  longitude: number
  city: string
  countryIso2: string
  distanceKm?: number        // from reference point
  metadata?: Record<string, unknown>
}

export interface NormalizedMarketTransaction {
  price: number
  currency: string
  sqft: number
  pricePerSqft: number
  propertyType: string
  bedrooms?: number
  city: string
  community?: string
  transactionDate: string
  source: string
}
