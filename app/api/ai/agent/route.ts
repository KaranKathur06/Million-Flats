import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { orchestrateAgent } from '@/lib/ai-core'
import {
  enforceAnonymousAIBudget,
  identityErrorResponse,
  isAIAdministrator,
  readLimitedJson,
  resolveAIRequestIdentity,
} from '@/lib/ai/publicAccess'

export const dynamic = 'force-dynamic'

async function getPublicAgentProfile(agentId: string) {
  const agent = await prisma.agent.findFirst({
    where: {
      id: agentId,
      approved: true,
      archivedAt: null,
      user: { status: 'ACTIVE' },
    },
    select: {
      id: true,
      profileImageUrl: true,
      profilePhoto: true,
      bio: true,
      countryIso2: true,
      user: { select: { name: true, city: true, countryIso2: true } },
      manualProperties: {
        where: { sourceType: 'MANUAL', status: 'PUBLISHED', archivedAt: null },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          title: true,
          propertyType: true,
          intent: true,
          price: true,
          currency: true,
          city: true,
          media: {
            orderBy: { position: 'asc' },
            take: 1,
            select: { url: true },
          },
        },
      },
      _count: {
        select: {
          manualProperties: {
            where: { sourceType: 'MANUAL', status: 'PUBLISHED', archivedAt: null },
          },
        },
      },
    },
  })
  if (!agent) return null

  const reviews = await prisma.agentReview.aggregate({
    where: { agentId },
    _avg: { rating: true },
    _count: { _all: true },
  })

  return {
    agentId: agent.id,
    isPublicProfile: true,
    displayName: agent.user.name || 'MillionFlats Agent',
    profilePhoto: agent.profileImageUrl || agent.profilePhoto,
    bio: agent.bio,
    city: agent.user.city,
    countryIso2: agent.countryIso2 || agent.user.countryIso2,
    rating: reviews._avg.rating,
    reviewCount: reviews._count._all,
    publishedListingCount: agent._count.manualProperties,
    listings: agent.manualProperties.map((property) => ({
      id: property.id,
      title: property.title,
      type: property.propertyType || property.intent,
      price: property.price,
      currency: property.currency,
      city: property.city,
      imageUrl: property.media[0]?.url || null,
    })),
  }
}

export async function GET(req: NextRequest) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError

  const limited = await enforceAnonymousAIBudget(req, identity, 'aipro', 5)
  if (limited) return limited

  const { searchParams } = new URL(req.url)
  const agentId = searchParams.get('agentId')?.trim()
  if (!agentId) return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 })

  const forceRefresh = searchParams.get('forceRefresh') === 'true'
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { id: true, userId: true, archivedAt: true },
  })
  const canReadFullReport = Boolean(
    agent &&
    identity.kind === 'authenticated' &&
    (isAIAdministrator(identity) || agent.userId === identity.userId),
  )

  if (forceRefresh && !canReadFullReport) {
    return NextResponse.json({ success: false, error: 'forceRefresh requires agent or admin access' }, { status: 400 })
  }
  if (agent?.archivedAt && !canReadFullReport) {
    return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
  }

  try {
    if (canReadFullReport) {
      const report = await orchestrateAgent(agentId, {
        forceRefresh,
        requestedBy: identity.kind === 'authenticated' ? identity.userId : 'anonymous',
      })
      if (!report) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
      return NextResponse.json(
        { success: true, data: report },
        { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
      )
    }

    const profile = await getPublicAgentProfile(agentId)
    if (!profile) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    return NextResponse.json(
      { success: true, data: profile },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('[GET /api/ai/agent] request failed', error)
    return NextResponse.json({ success: false, error: 'AIPro service temporarily unavailable' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const identity = await resolveAIRequestIdentity()
  const identityError = identityErrorResponse(identity)
  if (identityError) return identityError
  if (identity.kind !== 'authenticated') {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }

  const body = await readLimitedJson(req)
  if (!body.ok) {
    return NextResponse.json(
      { success: false, error: body.tooLarge ? 'Request body exceeds 1 MB' : 'Invalid JSON body' },
      { status: body.tooLarge ? 413 : 400 },
    )
  }
  if (!body.value || typeof body.value !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
  }
  const payload = body.value as { agentId?: unknown; forceRefresh?: unknown }
  const agentId = typeof payload.agentId === 'string' ? payload.agentId.trim() : ''
  if (!agentId) return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 })

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { userId: true },
  })
  if (!agent || (!isAIAdministrator(identity) && agent.userId !== identity.userId)) {
    return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
  }

  try {
    const report = await orchestrateAgent(agentId, {
      forceRefresh: payload.forceRefresh === true,
      requestedBy: identity.userId,
    })
    if (!report) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    return NextResponse.json(
      { success: true, data: report },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('[POST /api/ai/agent] request failed', error)
    return NextResponse.json({ success: false, error: 'AIPro service temporarily unavailable' }, { status: 500 })
  }
}
