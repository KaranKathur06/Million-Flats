import { prisma } from '@/lib/prisma'

export type RiskReason = {
  code: string
  weight: number
  meta?: Record<string, any>
}

export type RiskResult = {
  score: number
  reasons: RiskReason[]
  version: string
}

export const RISK_ENGINE_VERSION = '1.0.0'

function add(reasons: RiskReason[], code: string, weight: number, meta?: Record<string, any>) {
  reasons.push({ code, weight, meta })
}

function computeScore(reasons: RiskReason[]) {
  return reasons.reduce((sum, r) => sum + (Number.isFinite(r.weight) ? r.weight : 0), 0)
}

function hasExternalLink(text: string) {
  const t = String(text || '')
  return /(https?:\/\/|www\.)/i.test(t)
}

function hasPhoneLike(text: string) {
  const t = String(text || '')
  return /\+?\d[\d\s\-()]{7,}\d/.test(t)
}

export async function evaluateManualPropertyRisk(input: { propertyId: string }): Promise<RiskResult> {
  const propertyId = String(input.propertyId || '').trim()
  const reasons: RiskReason[] = []

  if (!propertyId) {
    return { score: 0, reasons, version: RISK_ENGINE_VERSION }
  }

  const p = await (prisma as any).manualProperty.findUnique({
    where: { id: propertyId },
    select: {
      id: true,
      price: true,
      shortDescription: true,
      createdAt: true,
      media: { select: { id: true } },
    },
  })

  if (!p) {
    return { score: 0, reasons, version: RISK_ENGINE_VERSION }
  }

  const price = typeof p.price === 'number' ? p.price : null
  if (price !== null && price > 0 && price < 1000) {
    add(reasons, 'PRICE_TOO_LOW', 30, { price })
  }

  const desc = String(p.shortDescription || '')
  if (hasExternalLink(desc)) {
    add(reasons, 'EXTERNAL_LINK', 25)
  }

  if (hasPhoneLike(desc)) {
    add(reasons, 'PHONE_IN_DESCRIPTION', 25)
  }

  const mediaCount = Array.isArray(p.media) ? p.media.length : 0
  if (mediaCount > 40) {
    add(reasons, 'TOO_MANY_MEDIA', 15, { mediaCount })
  }

  const createdAt = p.createdAt ? new Date(p.createdAt) : null
  if (createdAt && Date.now() - createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
    add(reasons, 'NEW_SUBMISSION', 10)
  }

  return { score: computeScore(reasons), reasons, version: RISK_ENGINE_VERSION }
}

export async function evaluateUserRisk(input: { userId: string }): Promise<RiskResult> {
  const userId = String(input.userId || '').trim()
  const reasons: RiskReason[] = []

  if (!userId) {
    return { score: 0, reasons, version: RISK_ENGINE_VERSION }
  }

  const u = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      createdAt: true,
      phoneCountryIso2: true,
      phoneNationalNumber: true,
    },
  })

  if (!u) {
    return { score: 0, reasons, version: RISK_ENGINE_VERSION }
  }

  const createdAt = u.createdAt ? new Date(u.createdAt) : null
  if (createdAt && Date.now() - createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
    add(reasons, 'NEW_ACCOUNT', 20)
  }

  const iso2 = String(u.phoneCountryIso2 || '').trim().toUpperCase()
  const national = String(u.phoneNationalNumber || '').trim()
  if (iso2 && national) {
    const dup = await (prisma as any).user.count({
      where: {
        phoneCountryIso2: iso2,
        phoneNationalNumber: national,
      },
    })

    if (typeof dup === 'number' && dup >= 2) {
      add(reasons, 'DUPLICATE_PHONE', 25, { count: dup })
    }
  }

  return { score: computeScore(reasons), reasons, version: RISK_ENGINE_VERSION }
}

export async function evaluateAgentRisk(input: { agentId: string }): Promise<RiskResult> {
  const agentId = String(input.agentId || '').trim()
  const reasons: RiskReason[] = []

  if (!agentId) {
    return { score: 0, reasons, version: RISK_ENGINE_VERSION }
  }

  const a = await (prisma as any).agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      createdAt: true,
      license: true,
      userId: true,
      user: {
        select: {
          id: true,
          createdAt: true,
          phoneCountryIso2: true,
          phoneNationalNumber: true,
        },
      },
    },
  })

  if (!a) {
    return { score: 0, reasons, version: RISK_ENGINE_VERSION }
  }

  const createdAt = a.createdAt ? new Date(a.createdAt) : null
  if (createdAt && Date.now() - createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
    add(reasons, 'NEW_AGENT', 15)
  }

  const license = String(a.license || '').trim()
  if (!license) {
    add(reasons, 'MISSING_LICENSE', 15)
  }

  // Reuse user risk signals
  const user = a.user
  const iso2 = String(user?.phoneCountryIso2 || '').trim().toUpperCase()
  const national = String(user?.phoneNationalNumber || '').trim()
  if (iso2 && national) {
    const dup = await (prisma as any).user.count({
      where: {
        phoneCountryIso2: iso2,
        phoneNationalNumber: national,
      },
    })

    if (typeof dup === 'number' && dup >= 2) {
      add(reasons, 'DUPLICATE_PHONE', 25, { count: dup })
    }
  }

  return { score: computeScore(reasons), reasons, version: RISK_ENGINE_VERSION }
}
