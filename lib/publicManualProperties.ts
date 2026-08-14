import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { MANUAL_PROPERTY_PUBLIC_STATUS } from '@/lib/manualPropertyLifecycle'
import {
  buildManualPropertyPath,
  normalizeManualPropertyIntent,
  parseManualPropertySlug,
  type ManualPropertyIntentValue,
} from '@/lib/manualPropertyRoutes'

export function manualPropertyPublicAgentWhere() {
  return {
    approved: true,
    profileStatus: 'LIVE',
    user: { status: 'ACTIVE' },
  }
}

export function manualPropertyPublicWhere(intent?: ManualPropertyIntentValue) {
  return {
    status: MANUAL_PROPERTY_PUBLIC_STATUS,
    sourceType: 'MANUAL',
    ...(intent ? { intent } : {}),
    agent: manualPropertyPublicAgentWhere(),
  }
}

export async function getPublicManualPropertyBySlug(rawSlug: string, expectedIntent?: ManualPropertyIntentValue) {
  const id = parseManualPropertySlug(rawSlug)
  if (!id) return null

  const property = await (prisma as any).manualProperty.findFirst({
    where: {
      id,
      ...manualPropertyPublicWhere(),
    },
    include: {
      media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] },
      agent: { include: { user: true } },
    },
  })

  if (!property) return null

  const canonicalIntent = normalizeManualPropertyIntent(property.intent)
  const canonicalPath = buildManualPropertyPath({
    id: property.id,
    title: property.title,
    intent: canonicalIntent,
  })

  if (expectedIntent && canonicalIntent !== expectedIntent) {
    redirect(canonicalPath)
  }

  const expectedSlug = canonicalPath.split('/').pop() || ''
  if (expectedSlug && rawSlug !== expectedSlug) {
    redirect(canonicalPath)
  }

  return property
}

export async function requirePublicManualProperty(rawSlug: string, expectedIntent?: ManualPropertyIntentValue) {
  const property = await getPublicManualPropertyBySlug(rawSlug, expectedIntent)
  if (!property) notFound()
  return property
}

export async function getRelatedManualProperties(property: any, take = 3) {
  const city = typeof property?.city === 'string' ? property.city.trim() : ''
  if (!city) return []

  return (prisma as any).manualProperty.findMany({
    where: {
      ...manualPropertyPublicWhere(normalizeManualPropertyIntent(property.intent)),
      id: { not: String(property.id) },
      city: { equals: city, mode: 'insensitive' },
    },
    include: {
      media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] },
      agent: { include: { user: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: Math.max(0, Math.min(3, take)),
  })
}
