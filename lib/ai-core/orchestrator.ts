// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Master AI Orchestrator
// Volume 3: AI/ML Pipeline
//
// THE single entry point for all AI intelligence on the platform.
// Every page, every API, every worker calls THIS — never individual engines.
//
// Architecture:
//   Request → Orchestrator → Feature Store → Engines (parallel) → Confidence
//   → Explainability → Audit Log → Response
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import { getFeatureVector } from './feature-store'
import { computeConfidence } from './confidence'
import { runValuationEngine } from './engines/valuation'
import { runInvestmentEngine } from './engines/investment'
import { runRiskEngine } from './engines/risk'
import { runMarketEngine } from './engines/market'
import type {
  EntityType,
  AIModule,
  ValuationReport,
  InvestmentIntelligence,
  MediaIntelligenceReport,
  LegalDocumentIntelligenceReport,
  AgentIntelligenceReport,
  PropertyIntelligenceBundle,
} from './types'

const ORCHESTRATOR_VERSION = '2.0.0'

// ─── Cache TTL ────────────────────────────────────────────────────────────────
const CACHE_TTL = {
  SHIELD: 6 * 60 * 60 * 1000,     // 6 hours
  INDEX: 24 * 60 * 60 * 1000,     // 24 hours
  VIEW: 12 * 60 * 60 * 1000,      // 12 hours
  TITLE: 7 * 24 * 60 * 60 * 1000, // 7 days
  PRO: 24 * 60 * 60 * 1000,       // 24 hours
  MARKET: 6 * 60 * 60 * 1000,     // 6 hours
}

// ─── Orchestrator Options ─────────────────────────────────────────────────────

export interface OrchestratorOptions {
  modules?: AIModule[]          // which engines to run (default: all applicable)
  forceRefresh?: boolean        // bypass cache
  requestedBy?: string          // userId | "system" | "worker"
  requestIp?: string
}

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export async function orchestrateProperty(
  entityId: string,
  entityType: EntityType,
  options: OrchestratorOptions = {}
): Promise<PropertyIntelligenceBundle> {
  const startTime = Date.now()
  const {
    modules = ['SHIELD', 'INDEX', 'MARKET', 'RISK'],
    forceRefresh = false,
    requestedBy = 'system',
  } = options

  // ── Step 1: Load Feature Vector ───────────────────────────────────────────
  const features = await getFeatureVector(entityId, entityType, { forceRefresh })
  
  // ── Step 2: Run engines in parallel ───────────────────────────────────────
  const [
    shieldResult,
    indexResult,
    riskResult,
    marketResult,
  ] = await Promise.allSettled([
    modules.includes('SHIELD')
      ? runValuationEngine(entityId, entityType, features, { forceRefresh })
      : Promise.resolve(undefined),
    modules.includes('INDEX')
      ? runInvestmentEngine(entityId, entityType, features, { forceRefresh })
      : Promise.resolve(undefined),
    modules.includes('RISK')
      ? runRiskEngine(entityId, entityType, features)
      : Promise.resolve(undefined),
    modules.includes('MARKET')
      ? runMarketEngine(entityId, entityType, features)
      : Promise.resolve(undefined),
  ])

  const shield = shieldResult.status === 'fulfilled' ? shieldResult.value : undefined
  const index = indexResult.status === 'fulfilled' ? indexResult.value : undefined
  const processingMs = Date.now() - startTime

  // ── Step 3: Compute composite scores ──────────────────────────────────────
  const overallAiScore = computeOverallScore(shield, index, features?.completeness)
  const trustScore = computeTrustScore(features)

  // ── Step 4: Audit log ─────────────────────────────────────────────────────
  auditLog({
    entityId,
    entityType,
    modulesRun: modules,
    overallScore: overallAiScore,
    processingMs,
    requestedBy,
  }).catch(() => {}) // non-fatal

  return {
    entityId,
    entityType,
    shield: shield ?? undefined,
    index: index ?? undefined,
    view: undefined,   // populated by separate AIView call
    title: undefined,  // populated by separate AITitle call
    overallAiScore,
    trustScore,
    computedAt: new Date().toISOString(),
    enginesRun: modules,
  }
}

// ─── Single Engine Calls (for targeted use) ───────────────────────────────────

export async function getValuationReport(
  entityId: string,
  entityType: EntityType,
  options: OrchestratorOptions = {}
): Promise<ValuationReport | null> {
  const features = await getFeatureVector(entityId, entityType, options)
  return runValuationEngine(entityId, entityType, features, options)
}

export async function getInvestmentReport(
  entityId: string,
  entityType: EntityType,
  options: OrchestratorOptions = {}
): Promise<InvestmentIntelligence | null> {
  const features = await getFeatureVector(entityId, entityType, options)
  return runInvestmentEngine(entityId, entityType, features, options)
}

// ─── Agent Intelligence (separate from property) ──────────────────────────────

export async function orchestrateAgent(
  agentId: string,
  options: OrchestratorOptions = {}
): Promise<AgentIntelligenceReport | null> {
  const { runAgentIntelligenceEngine } = await import('./engines/agent')
  return runAgentIntelligenceEngine(agentId, options)
}

// ─── Vision Intelligence (for media uploads) ──────────────────────────────────

export async function analyzeMedia(
  entityId: string,
  entityType: EntityType,
  imageUrls: string[],
  options: OrchestratorOptions = {}
): Promise<MediaIntelligenceReport | null> {
  const { runVisionEngine } = await import('./engines/vision')
  return runVisionEngine(entityId, entityType, imageUrls, options)
}

// ─── Legal Intelligence (for document uploads) ────────────────────────────────

export async function analyzeDocument(
  entityId: string,
  entityType: EntityType,
  documentUrl: string,
  documentType: string,
  options: OrchestratorOptions = {}
): Promise<LegalDocumentIntelligenceReport | null> {
  const { runLegalEngine } = await import('./engines/legal')
  return runLegalEngine(entityId, entityType, documentUrl, documentType, options)
}

// ─── Event-Driven Trigger ─────────────────────────────────────────────────────
// Called by event handlers when platform events occur

export async function triggerAIOnEvent(
  eventType: string,
  entityId: string,
  entityType: string,
  payload?: Record<string, unknown>
): Promise<void> {
  // Determine which AI modules to run based on event type
  const moduleMap: Record<string, AIModule[]> = {
    'PROPERTY_CREATED':        ['SHIELD', 'INDEX', 'RISK', 'MARKET'],
    'PROPERTY_UPDATED':        ['SHIELD', 'RISK'],
    'PROPERTY_PRICE_CHANGED':  ['SHIELD'],
    'IMAGE_UPLOADED':          ['VIEW'],
    'DOCUMENT_UPLOADED':       ['TITLE'],
    'TRANSACTION_CLOSED':      ['SHIELD', 'MARKET'],  // recompute with actual sale price
    'REVIEW_ADDED':            ['PRO'],
    'INFRASTRUCTURE_UPDATED':  ['INDEX', 'MARKET'],    // re-run investment scores for affected area
    'AGENT_METRICS_UPDATED':   ['PRO'],
  }

  const modules = moduleMap[eventType]
  if (!modules || modules.length === 0) return

  // Run appropriate engines
  if (entityType === 'MANUAL_PROPERTY' || entityType === 'PROJECT') {
    await orchestrateProperty(entityId, entityType as EntityType, {
      modules,
      forceRefresh: true,
      requestedBy: 'system:event:' + eventType,
    }).catch(err => {
      console.error(`[AIOrchestrator] Event ${eventType} trigger failed for ${entityId}:`, err)
    })
  }

  if (eventType === 'REVIEW_ADDED' && entityType === 'AGENT') {
    await orchestrateAgent(entityId, {
      forceRefresh: true,
      requestedBy: 'system:event:' + eventType,
    }).catch(err => {
      console.error(`[AIOrchestrator] Agent event trigger failed for ${entityId}:`, err)
    })
  }
}

// ─── Composite Score Calculators ──────────────────────────────────────────────

function computeOverallScore(
  shield?: ValuationReport | null,
  index?: InvestmentIntelligence | null,
  featureCompleteness?: number
): number {
  const scores: number[] = []
  
  if (shield?.confidence?.score) {
    scores.push(shield.confidence.score)
  }
  if (index?.overallGrade?.score) {
    scores.push(index.overallGrade.score)
  }
  if (featureCompleteness !== undefined) {
    scores.push(featureCompleteness)
  }
  
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

function computeTrustScore(features: any): number {
  if (!features) return 50
  
  let score = 50  // base
  
  if (features.reraRegistered) score += 20
  if (features.mediaTrustScore) score += Math.round((features.mediaTrustScore / 100) * 15)
  if (features.documentCompletenessScore) score += Math.round((features.documentCompletenessScore / 100) * 15)
  if (features.litigationCount && features.litigationCount > 0) score -= 15
  if (features.hasEncumbrance) score -= 10
  if (features.hasDefectsDetected) score -= 5
  
  return Math.min(100, Math.max(0, score))
}

// ─── Audit Logging ────────────────────────────────────────────────────────────

async function auditLog(params: {
  entityId: string
  entityType: string
  modulesRun: AIModule[]
  overallScore: number
  processingMs: number
  requestedBy: string
}): Promise<void> {
  try {
    // Log the orchestration run
    await prisma.aIIntelligenceAuditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        moduleType: 'SHIELD',  // primary module
        action: 'ORCHESTRATION',
        outputResult: {
          modulesRun: params.modulesRun,
          overallScore: params.overallScore,
          orchestratorVersion: ORCHESTRATOR_VERSION,
        },
        processingMs: params.processingMs,
        requestedBy: params.requestedBy,
      },
    })
  } catch {
    // Non-fatal — don't let audit failure break the response
  }
}
