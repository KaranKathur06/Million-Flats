// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — Ingestion Pipeline
// Phase 4: Market Intelligence Pipeline
//
// The main data flow:
//   Provider → Collector → Normalizer → Validator → Quality Score →
//   Deduplicator → Canonical Model → Knowledge Graph → Feature Store
//
// No AI engine may consume raw provider data directly.
// Everything flows through this pipeline.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import {
  collectFromCategory,
  processRawRecords,
  type IDataProvider,
  type ProviderCategory,
  type CollectionParams,
  type ProviderCollectionResult,
} from '../providers/framework'
import { assessPropertyQuality, type DataQualityScore } from '../quality'
import { writeEdge, type KGEdge } from '../knowledge-graph'

// ─── Pipeline Result ─────────────────────────────────────────────────────────

export interface PipelineResult<T> {
  success: boolean
  /** Records that passed through the full pipeline */
  records: PipelineRecord<T>[]
  /** Aggregate statistics */
  stats: PipelineStats
  /** Errors encountered during pipeline execution */
  errors: PipelineError[]
  /** Pipeline execution time in ms */
  durationMs: number
}

export interface PipelineRecord<T> {
  data: T
  source: string
  quality: DataQualityScore
  anomalies: string[]
}

export interface PipelineStats {
  providersQueried: number
  providersSucceeded: number
  providersFailed: number
  rawRecordsCollected: number
  validRecords: number
  invalidRecords: number
  duplicatesRemoved: number
  normalizedRecords: number
  qualityScoreAvg: number
  knowledgeEdgesWritten: number
}

export interface PipelineError {
  stage: 'COLLECTION' | 'VALIDATION' | 'NORMALIZATION' | 'DEDUP' | 'QUALITY' | 'KNOWLEDGE_GRAPH'
  provider?: string
  message: string
  recordIndex?: number
}

// ─── Run Pipeline ────────────────────────────────────────────────────────────

/**
 * Run the full ingestion pipeline for a given provider category.
 * 
 * Flow:
 * 1. Collect from all providers in the category
 * 2. Validate raw records
 * 3. Normalize to canonical models
 * 4. Deduplicate
 * 5. Assess data quality
 * 6. Write knowledge graph edges
 * 7. Return pipeline records with quality scores
 */
export async function runPipeline<TRaw, TNormalized>(
  category: ProviderCategory,
  params: CollectionParams,
  options: {
    /** Custom knowledge graph edge generator for this record type */
    generateEdges?: (record: TNormalized, source: string) => KGEdge[]
    /** Quality assessment function */
    assessQuality?: (record: TNormalized, confidence: number, isTemp: boolean, ageHours?: number) => DataQualityScore
    /** Minimum quality score to include in results */
    minQualityScore?: number
  } = {}
): Promise<PipelineResult<TNormalized>> {
  const start = Date.now()
  const errors: PipelineError[] = []
  const allRecords: PipelineRecord<TNormalized>[] = []

  let stats: PipelineStats = {
    providersQueried: 0,
    providersSucceeded: 0,
    providersFailed: 0,
    rawRecordsCollected: 0,
    validRecords: 0,
    invalidRecords: 0,
    duplicatesRemoved: 0,
    normalizedRecords: 0,
    qualityScoreAvg: 0,
    knowledgeEdgesWritten: 0,
  }

  try {
    // ── Step 1: Collect ────────────────────────────────────────────────────────
    const collectionResults = await collectFromCategory<TRaw>(category, params)

    stats.providersQueried = collectionResults.length
    stats.providersSucceeded = collectionResults.filter(r => r.success).length
    stats.providersFailed = collectionResults.filter(r => !r.success).length

    // Record collection errors
    for (const result of collectionResults) {
      if (!result.success) {
        errors.push({
          stage: 'COLLECTION',
          provider: result.source,
          message: result.error ?? 'Collection failed',
        })
      }
    }

    // ── Step 2-4: Validate → Normalize → Deduplicate per provider ──────────────
    // We need the provider instance to call validate/normalize/deduplicate
    // Since collectFromCategory returns raw data, we need to get providers
    const { getProviders } = await import('../providers/framework/registry')
    const providers = getProviders(category)

    for (const collectionResult of collectionResults) {
      if (!collectionResult.success || !collectionResult.data.length) continue

      stats.rawRecordsCollected += collectionResult.data.length

      // Find the provider that produced this data
      const provider = providers.find(p => p.name === collectionResult.source) as
        IDataProvider<TRaw, TNormalized> | undefined

      if (!provider) {
        errors.push({
          stage: 'NORMALIZATION',
          provider: collectionResult.source,
          message: `Provider "${collectionResult.source}" not found in registry`,
        })
        continue
      }

      // Process through validate → normalize → deduplicate
      const processed = processRawRecords(provider, collectionResult.data)

      stats.validRecords += processed.stats.valid
      stats.invalidRecords += processed.stats.invalid
      stats.duplicatesRemoved += processed.stats.deduped
      stats.normalizedRecords += processed.deduplicated.length

      // Record validation errors
      for (const ve of processed.validationErrors) {
        errors.push({
          stage: 'VALIDATION',
          provider: collectionResult.source,
          recordIndex: ve.index,
          message: ve.errors.errors.map(e => `${e.field}: ${e.message}`).join('; '),
        })
      }

      // ── Step 5: Assess quality ──────────────────────────────────────────────
      for (const record of processed.deduplicated) {
        const qualityScore = options.assessQuality
          ? options.assessQuality(
              record,
              provider.getConfidence(),
              provider.isTemporary,
              computeDataAgeHours(collectionResult.fetchedAt)
            )
          : assessPropertyQuality(
              record as Record<string, unknown>,
              provider.getConfidence(),
              provider.isTemporary,
              computeDataAgeHours(collectionResult.fetchedAt)
            )

        // Filter by minimum quality if specified
        if (options.minQualityScore && qualityScore.overall < options.minQualityScore) {
          continue
        }

        allRecords.push({
          data: record,
          source: collectionResult.source,
          quality: qualityScore,
          anomalies: [],
        })
      }

      // ── Step 6: Write knowledge graph edges ─────────────────────────────────
      if (options.generateEdges) {
        for (const record of processed.deduplicated) {
          try {
            const edges = options.generateEdges(record, collectionResult.source)
            for (const edge of edges) {
              await writeEdge(edge)
              stats.knowledgeEdgesWritten++
            }
          } catch (err: any) {
            errors.push({
              stage: 'KNOWLEDGE_GRAPH',
              provider: collectionResult.source,
              message: err?.message ?? 'Failed to write knowledge graph edge',
            })
          }
        }
      }
    }

    // Compute average quality
    stats.qualityScoreAvg = allRecords.length > 0
      ? Math.round(allRecords.reduce((sum, r) => sum + r.quality.overall, 0) / allRecords.length)
      : 0

  } catch (err: any) {
    errors.push({
      stage: 'COLLECTION',
      message: err?.message ?? 'Pipeline execution failed',
    })
  }

  return {
    success: errors.filter(e => e.stage === 'COLLECTION').length === 0,
    records: allRecords,
    stats,
    errors,
    durationMs: Date.now() - start,
  }
}

// ─── Convenience: Run Listings Pipeline ──────────────────────────────────────

export async function runListingsPipeline(
  params: CollectionParams
): Promise<PipelineResult<unknown>> {
  return runPipeline('PLATFORM_LISTINGS', params)
}

// ─── Convenience: Run Market Data Pipeline ───────────────────────────────────

export async function runMarketDataPipeline(
  params: CollectionParams
): Promise<PipelineResult<unknown>> {
  const { assessMarketDataQuality } = await import('../quality')

  return runPipeline('MARKET_INDICATORS', params, {
    assessQuality: (record, confidence, isTemp, ageHours) =>
      assessMarketDataQuality(
        record as Record<string, unknown>,
        confidence,
        isTemp,
        ageHours
      ),
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDataAgeHours(fetchedAt: string): number {
  return (Date.now() - new Date(fetchedAt).getTime()) / (1000 * 60 * 60)
}
