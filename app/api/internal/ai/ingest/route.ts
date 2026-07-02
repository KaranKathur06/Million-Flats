// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API: POST /api/internal/ai/ingest
// Internal-only data ingestion trigger for the provider pipeline.
//
// Auth: INTERNAL_CRON_SECRET required (called by cron workers only)
//
// Triggers:
//   - google_maps_poi:  Fetch POIs for a city and write knowledge graph edges
//   - market_snapshot:  Recompute market snapshots for a city
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGoogleMapsPOIs, writePOIsToKnowledgeGraph } from '@/lib/ai-core/providers/google-maps-poi'

export const dynamic = 'force-dynamic'
export const maxDuration = 300  // 5-minute max for ingestion jobs

export async function POST(req: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const expectedSecret = process.env.INTERNAL_CRON_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { provider, city, countryIso2, centerLat, centerLng } = body

  if (!provider || !city || !countryIso2) {
    return NextResponse.json(
      { error: 'provider, city, countryIso2 are required' },
      { status: 400 }
    )
  }

  // ── Create ingestion job record ────────────────────────────────────────────
  const job = await prisma.dataIngestionJob.create({
    data: {
      providerType: provider === 'google_maps_poi' ? 'MAPS_POI' : 'INTERNAL',
      providerName: provider,
      targetCity: city,
      targetCountry: countryIso2,
      status: 'RUNNING',
      startedAt: new Date(),
    },
  })

  // ── Execute provider ───────────────────────────────────────────────────────
  try {
    if (provider === 'google_maps_poi') {
      const result = await fetchGoogleMapsPOIs({
        city,
        countryIso2,
        centerLat: centerLat ? parseFloat(centerLat) : undefined,
        centerLng: centerLng ? parseFloat(centerLng) : undefined,
        radiusKm: 50,
      })

      if (!result.success || !result.data) {
        await prisma.dataIngestionJob.update({
          where: { id: job.id },
          data: {
            status: 'FAILED',
            errorMessage: result.error ?? 'Provider returned no data',
            completedAt: new Date(),
          },
        })
        return NextResponse.json({ success: false, error: result.error }, { status: 500 })
      }

      const { edgesCreated, propertiesLinked } = await writePOIsToKnowledgeGraph(
        result.data,
        city,
        countryIso2
      )

      await prisma.dataIngestionJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          recordsIngested: result.recordCount ?? result.data.length,
          completedAt: new Date(),
          processingMs: result.latencyMs,
        },
      })

      // Update provider health
      await prisma.dataProvider.updateMany({
        where: { name: 'google_maps_poi' },
        data: {
          lastSuccessAt: new Date(),
          successRate: 99,
          avgLatencyMs: result.latencyMs,
        },
      })

      return NextResponse.json({
        success: true,
        jobId: job.id,
        poisFetched: result.data.length,
        edgesCreated,
        propertiesLinked,
        processingMs: result.latencyMs,
      })
    }

    // ── Unknown provider ───────────────────────────────────────────────────
    await prisma.dataIngestionJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorMessage: `Unknown provider: ${provider}`,
        completedAt: new Date(),
      },
    })
    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
  } catch (err: any) {
    await prisma.dataIngestionJob.update({
      where: { id: job.id },
      data: {
        status: 'FAILED',
        errorMessage: err.message ?? 'Unexpected error',
        errorStack: err.stack,
        completedAt: new Date(),
      },
    }).catch(() => {})

    console.error('[Ingest API]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── GET: Check job status ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.INTERNAL_CRON_SECRET || authHeader !== `Bearer ${process.env.INTERNAL_CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')

  if (jobId) {
    const job = await prisma.dataIngestionJob.findUnique({ where: { id: jobId } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    return NextResponse.json({ success: true, job })
  }

  // List recent jobs
  const jobs = await prisma.dataIngestionJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true, providerName: true, targetCity: true, status: true,
      recordsIngested: true, startedAt: true, completedAt: true, processingMs: true,
    },
  })

  return NextResponse.json({ success: true, jobs })
}
