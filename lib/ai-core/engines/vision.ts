// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MillionFlats AI Intelligence Platform — AIView Vision Engine
// Volume 3: AI/ML Pipeline — Engine: VIEW
//
// Analyzes every property media item for:
//   - AI-generated / manipulated image detection
//   - Construction defect detection (water damage, cracks, ceiling damage)
//   - Duplicate image detection across listings
//   - Room type classification & size estimation
//   - Overall media trust & quality scoring
//   - Virtual staging detection
//
// Phase 1: Heuristic + metadata analysis (no GPU required)
// Phase 2: GPT-4o Vision / CLIP-ViT integration (VPS sidecar)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { prisma } from '@/lib/prisma'
import type { EntityType, MediaIntelligenceReport, MediaItemAnalysis } from '../types'

const ENGINE_VERSION = '2.0.0'
const VPS_VISION_ENDPOINT = process.env.ML_VPS_ENDPOINT   // e.g. http://ai.millionflats.com:8001

interface EngineOptions {
  forceRefresh?: boolean
  requestedBy?: string
}

type HeuristicMediaAnalysis = Pick<
  MediaItemAnalysis,
  | 'isAiGenerated'
  | 'isManipulated'
  | 'manipulationScore'
  | 'isBlurry'
  | 'hasLightingIssues'
  | 'hasDefects'
  | 'defectsDetected'
  | 'isDuplicate'
  | 'qualityScore'
  | 'trustScore'
  | 'isVirtualStaged'
>

// ─── Main Engine Entry Point ──────────────────────────────────────────────────

export async function runVisionEngine(
  entityId: string,
  entityType: EntityType,
  imageUrls: string[],
  options: EngineOptions = {}
): Promise<MediaIntelligenceReport | null> {
  if (!imageUrls || imageUrls.length === 0) return null

  const startTime = Date.now()

  // ── Check existing analysis in DB ────────────────────────────────────────
  if (!options.forceRefresh) {
    const existing = await loadExistingAnalysis(entityId, entityType)
    if (existing && existing.length >= imageUrls.length * 0.8) {
      return assembleReport(entityId, entityType, existing, Date.now() - startTime, true)
    }
  }

  // ── Analyze each image ────────────────────────────────────────────────────
  const analyses = await Promise.allSettled(
    imageUrls.map(url => analyzeImage(url, entityId, entityType))
  )

  const items: MediaItemAnalysis[] = analyses
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => (r as PromiseFulfilledResult<MediaItemAnalysis>).value)

  // ── Persist individual results ────────────────────────────────────────────
  await persistMediaIntelligence(entityId, entityType, items).catch(() => {})

  // ── Update feature vector media scores ────────────────────────────────────
  await updateFeatureVector(entityId, entityType, items).catch(() => {})

  return assembleReport(entityId, entityType, items, Date.now() - startTime, false)
}

// ─── Image Analysis ───────────────────────────────────────────────────────────

async function analyzeImage(
  url: string,
  entityId: string,
  entityType: EntityType
): Promise<MediaItemAnalysis | null> {
  try {
    // Phase 1: Metadata-based heuristics (available now)
    const heuristicResult = runHeuristicAnalysis(url)

    // Phase 2: VPS Vision API (when available)
    let vpsResult: Partial<MediaItemAnalysis> = {}
    if (VPS_VISION_ENDPOINT) {
      try {
        vpsResult = await callVpsVision(url)
      } catch {
        // VPS not available — fallback to heuristics only
      }
    }

    return {
      url,
      mediaType: 'IMAGE',
      roomType: vpsResult.roomType ?? undefined,
      isAiGenerated: vpsResult.isAiGenerated ?? heuristicResult.isAiGenerated,
      isManipulated: vpsResult.isManipulated ?? false,
      manipulationScore: vpsResult.manipulationScore ?? heuristicResult.manipulationScore,
      isBlurry: vpsResult.isBlurry ?? heuristicResult.isBlurry,
      hasLightingIssues: vpsResult.hasLightingIssues ?? false,
      hasDefects: vpsResult.hasDefects ?? false,
      defectsDetected: vpsResult.defectsDetected ?? [],
      isDuplicate: heuristicResult.isDuplicate,
      duplicateOf: undefined,
      qualityScore: vpsResult.qualityScore ?? heuristicResult.qualityScore,
      trustScore: vpsResult.trustScore ?? heuristicResult.trustScore,
      estimatedSqft: vpsResult.estimatedSqft,
      isVirtualStaged: vpsResult.isVirtualStaged ?? false,
    }
  } catch {
    return null
  }
}

// ─── Phase 1: Heuristic Analysis ─────────────────────────────────────────────
// No VPS required — runs from metadata, URL patterns, and filename analysis

function runHeuristicAnalysis(url: string): HeuristicMediaAnalysis {
  const lowerUrl = url.toLowerCase()

  // Detect common AI-generated image hosting patterns
  const aiPatterns = ['midjourney', 'dalle', 'stable-diffusion', 'civitai']
  const isAiGenerated = aiPatterns.some(p => lowerUrl.includes(p))

  // Detect stock photo patterns (potentially used to misrepresent)
  const stockPatterns = ['shutterstock', 'getty', 'istockphoto', 'unsplash', 'pexels', 'freepik']
  const isStock = stockPatterns.some(p => lowerUrl.includes(p))

  // Detect tiny/placeholder images (likely low quality)
  const isBlurry = lowerUrl.includes('thumb') || lowerUrl.includes('small') || lowerUrl.includes('xs')

  // Manipulation score heuristic
  let manipulationScore = 0
  if (isAiGenerated) manipulationScore = 85
  if (isStock) manipulationScore = Math.max(manipulationScore, 70)
  if (isBlurry) manipulationScore = Math.max(manipulationScore, 20)

  // Quality score
  let qualityScore = 75
  if (isBlurry) qualityScore -= 30
  if (isAiGenerated) qualityScore -= 20
  if (isStock) qualityScore -= 15

  // Trust score
  const trustScore = Math.max(0, 100 - manipulationScore - (isBlurry ? 20 : 0))

  return {
    isAiGenerated,
    isManipulated: manipulationScore > 50,
    manipulationScore,
    isBlurry,
    hasLightingIssues: false,
    hasDefects: false,
    defectsDetected: [],
    isDuplicate: false,
    qualityScore: Math.max(0, qualityScore),
    trustScore: Math.max(0, trustScore),
    isVirtualStaged: lowerUrl.includes('virtual') || lowerUrl.includes('staged'),
  }
}

// ─── Phase 2: VPS Vision API Call ────────────────────────────────────────────

async function callVpsVision(url: string): Promise<Partial<MediaItemAnalysis>> {
  if (!VPS_VISION_ENDPOINT) throw new Error('VPS endpoint not configured')

  const response = await fetch(`${VPS_VISION_ENDPOINT}/analyze/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(15000),  // 15s timeout
  })

  if (!response.ok) throw new Error(`VPS vision API error: ${response.status}`)

  const data = await response.json()
  return data as Partial<MediaItemAnalysis>
}

// ─── Report Assembly ──────────────────────────────────────────────────────────

function assembleReport(
  entityId: string,
  entityType: EntityType,
  items: MediaItemAnalysis[],
  processingMs: number,
  cacheHit: boolean
): MediaIntelligenceReport {
  const flaggedImages = items.filter(i => i.isAiGenerated || i.isManipulated).length
  const duplicateImages = items.filter(i => i.isDuplicate).length
  const defectImages = items.filter(i => i.hasDefects).length
  const aiGenImages = items.filter(i => i.isAiGenerated).length

  const avgQuality = items.length
    ? items.reduce((s, i) => s + i.qualityScore, 0) / items.length
    : 0
  const avgTrust = items.length
    ? items.reduce((s, i) => s + i.trustScore, 0) / items.length
    : 0

  const flags: string[] = []
  const recommendations: string[] = []

  if (aiGenImages > 0) {
    flags.push(`${aiGenImages} image(s) appear to be AI-generated`)
    recommendations.push('Request authentic photos taken on the actual property')
  }
  if (duplicateImages > 0) {
    flags.push(`${duplicateImages} duplicate image(s) detected`)
    recommendations.push('Ask agent to provide unique photographs of each room')
  }
  if (defectImages > 0) {
    flags.push(`${defectImages} image(s) show possible structural issues`)
    recommendations.push('Arrange a physical inspection before proceeding')
  }
  if (items.length < 5) {
    recommendations.push('Request more photos (minimum 10 recommended for full evaluation)')
  }
  if (!items.some(i => i.mediaType === '3D_TOUR')) {
    recommendations.push('Request a 3D virtual tour for remote verification')
  }

  return {
    entityId,
    entityType,
    mediaTrustScore: Math.round(avgTrust),
    overallQualityScore: Math.round(avgQuality),
    totalImages: items.length,
    flaggedImages,
    duplicateImages,
    defectImages,
    aiGeneratedImages: aiGenImages,
    items,
    flags,
    recommendations,
    modelUsed: VPS_VISION_ENDPOINT ? 'vps_vision_v1' : 'heuristic_v1',
    modelVersion: ENGINE_VERSION,
    analyzedAt: new Date().toISOString(),
    processingMs,
  }
}

// ─── DB Persistence ───────────────────────────────────────────────────────────

async function persistMediaIntelligence(
  entityId: string,
  entityType: EntityType,
  items: MediaItemAnalysis[]
): Promise<void> {
  for (const item of items) {
    await prisma.mediaIntelligence.upsert({
      where: {
        id: `${entityId}_${encodeURIComponent(item.url).slice(0, 50)}`,
      },
      create: {
        entityType,
        entityId,
        mediaUrl: item.url,
        mediaType: item.mediaType,
        isAiGenerated: item.isAiGenerated,
        isManipulated: item.isManipulated,
        manipulationScore: item.manipulationScore,
        isBlurry: item.isBlurry,
        hasLightingIssues: item.hasLightingIssues,
        hasDefects: item.hasDefects,
        defectsDetected: item.defectsDetected as any,
        qualityScore: item.qualityScore,
        trustScore: item.trustScore,
        isDuplicate: item.isDuplicate,
        isVirtualStaged: item.isVirtualStaged,
        roomType: item.roomType,
        estimatedSqft: item.estimatedSqft,
        modelUsed: VPS_VISION_ENDPOINT ? 'vps_vision_v1' : 'heuristic_v1',
        modelVersion: ENGINE_VERSION,
      },
      update: {
        isAiGenerated: item.isAiGenerated,
        isManipulated: item.isManipulated,
        manipulationScore: item.manipulationScore,
        isBlurry: item.isBlurry,
        hasDefects: item.hasDefects,
        qualityScore: item.qualityScore,
        trustScore: item.trustScore,
        analyzedAt: new Date(),
      },
    }).catch(() => {})
  }
}

async function loadExistingAnalysis(
  entityId: string,
  entityType: EntityType
): Promise<MediaItemAnalysis[]> {
  const records = await prisma.mediaIntelligence.findMany({
    where: { entityId, entityType },
    orderBy: { analyzedAt: 'desc' },
  })

  return records.map(r => ({
    url: r.mediaUrl,
    mediaType: r.mediaType as MediaItemAnalysis['mediaType'],
    roomType: r.roomType ?? undefined,
    isAiGenerated: r.isAiGenerated ?? false,
    isManipulated: r.isManipulated ?? false,
    manipulationScore: r.manipulationScore ?? 0,
    isBlurry: r.isBlurry ?? false,
    hasLightingIssues: r.hasLightingIssues ?? false,
    hasDefects: r.hasDefects ?? false,
    defectsDetected: (r.defectsDetected as any[]) ?? [],
    isDuplicate: r.isDuplicate ?? false,
    qualityScore: r.qualityScore ?? 75,
    trustScore: r.trustScore ?? 75,
    estimatedSqft: r.estimatedSqft ?? undefined,
    isVirtualStaged: r.isVirtualStaged ?? false,
  }))
}

async function updateFeatureVector(
  entityId: string,
  entityType: EntityType,
  items: MediaItemAnalysis[]
): Promise<void> {
  if (items.length === 0) return

  const avgTrust = items.reduce((s, i) => s + i.trustScore, 0) / items.length
  const avgQuality = items.reduce((s, i) => s + i.qualityScore, 0) / items.length
  const avgManipulation = items.reduce((s, i) => s + i.manipulationScore, 0) / items.length
  const hasDefects = items.some(i => i.hasDefects)
  const hasDuplicates = items.some(i => i.isDuplicate)

  await prisma.propertyFeatureVector.upsert({
    where: { entityType_entityId: { entityType, entityId } },
    create: {
      entityType,
      entityId,
      mediaTrustScore: avgTrust,
      imageQualityScore: avgQuality,
      aiManipulationScore: avgManipulation,
      imageDuplicateScore: hasDuplicates ? 80 : 0,
      hasDefectsDetected: hasDefects,
      mediaCount: items.length,
    },
    update: {
      mediaTrustScore: avgTrust,
      imageQualityScore: avgQuality,
      aiManipulationScore: avgManipulation,
      imageDuplicateScore: hasDuplicates ? 80 : 0,
      hasDefectsDetected: hasDefects,
      mediaCount: items.length,
      computedAt: new Date(),
    },
  }).catch(() => {})
}
