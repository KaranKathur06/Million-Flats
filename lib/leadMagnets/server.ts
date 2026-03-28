import { prisma } from '@/lib/prisma'
import { createSignedGetUrl } from '@/lib/s3'
import { DEFAULT_FAQ_LEAD_MAGNET_SLUG } from './constants'

export type PublicLeadMagnet = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  ctaLabel: string
  loginHint: string
  badgeText: string | null
  cooldownHours: number
  popupDelaySeconds: number
  popupScrollPercent: number
}

function toInt(value: unknown, fallback: number, min: number, max: number) {
  const num = Number.parseInt(String(value ?? ''), 10)
  if (!Number.isFinite(num)) return fallback
  return Math.max(min, Math.min(max, num))
}

export function getFaqLeadMagnetSlug() {
  return String(process.env.LEAD_MAGNET_FAQ_SLUG || DEFAULT_FAQ_LEAD_MAGNET_SLUG).trim() || DEFAULT_FAQ_LEAD_MAGNET_SLUG
}

function fallbackLeadMagnet(): (PublicLeadMagnet & { fileS3Key: string | null; isActive: boolean; popupEnabled: boolean }) | null {
  const fileS3Key = String(process.env.LEAD_MAGNET_FAQ_S3_KEY || '').trim() || null
  if (!fileS3Key) return null

  return {
    id: 'fallback-faq-guide',
    slug: getFaqLeadMagnetSlug(),
    title: String(process.env.LEAD_MAGNET_FAQ_TITLE || 'Dubai Real Estate Investor Guide (Free)').trim(),
    subtitle: String(process.env.LEAD_MAGNET_FAQ_SUBTITLE || 'Avoid 7 costly mistakes in Dubai real estate. Get insider insights used by top investors.').trim(),
    ctaLabel: String(process.env.LEAD_MAGNET_FAQ_CTA || 'Download Free Guide').trim(),
    loginHint: String(process.env.LEAD_MAGNET_FAQ_HINT || 'Login required').trim(),
    badgeText: String(process.env.LEAD_MAGNET_FAQ_BADGE || 'Exclusive for Registered Users').trim(),
    cooldownHours: toInt(process.env.LEAD_MAGNET_FAQ_COOLDOWN_HOURS, 24, 1, 168),
    popupDelaySeconds: toInt(process.env.LEAD_MAGNET_FAQ_DELAY_SECONDS, 4, 1, 30),
    popupScrollPercent: toInt(process.env.LEAD_MAGNET_FAQ_SCROLL_PERCENT, 25, 5, 80),
    fileS3Key,
    isActive: true,
    popupEnabled: String(process.env.LEAD_MAGNET_FAQ_POPUP_ENABLED || 'true').toLowerCase() !== 'false',
  }
}

export async function getPopupLeadMagnet(): Promise<PublicLeadMagnet | null> {
  let dbMagnet: any = null

  try {
    dbMagnet = await (prisma as any).leadMagnet.findFirst({
      where: { isActive: true, popupEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        ctaLabel: true,
        loginHint: true,
        badgeText: true,
        cooldownHours: true,
        popupDelaySeconds: true,
        popupScrollPercent: true,
      },
    })
  } catch {
    dbMagnet = null
  }

  if (dbMagnet) {
    return {
      id: String(dbMagnet.id),
      slug: String(dbMagnet.slug),
      title: String(dbMagnet.title),
      subtitle: dbMagnet.subtitle ? String(dbMagnet.subtitle) : null,
      ctaLabel: String(dbMagnet.ctaLabel || 'Download Free Guide'),
      loginHint: String(dbMagnet.loginHint || 'Login required'),
      badgeText: dbMagnet.badgeText ? String(dbMagnet.badgeText) : null,
      cooldownHours: toInt(dbMagnet.cooldownHours, 24, 1, 168),
      popupDelaySeconds: toInt(dbMagnet.popupDelaySeconds, 4, 1, 30),
      popupScrollPercent: toInt(dbMagnet.popupScrollPercent, 25, 5, 80),
    }
  }

  const fallback = fallbackLeadMagnet()
  if (!fallback || !fallback.popupEnabled || !fallback.isActive) return null

  const { fileS3Key: _unused, isActive: _a, popupEnabled: _p, ...safe } = fallback
  return safe
}

type ResolveLeadMagnet = {
  id: string
  slug: string
  fileS3Key: string
  title: string
}

export async function resolveDownloadableLeadMagnet(slug: string): Promise<ResolveLeadMagnet | null> {
  const cleanSlug = String(slug || '').trim()
  if (!cleanSlug) return null

  let dbMagnet: any = null

  try {
    dbMagnet = await (prisma as any).leadMagnet.findFirst({
      where: { slug: cleanSlug, isActive: true },
      select: { id: true, slug: true, fileS3Key: true, title: true },
    })
  } catch {
    dbMagnet = null
  }

  if (dbMagnet && dbMagnet.fileS3Key) {
    return {
      id: String(dbMagnet.id),
      slug: String(dbMagnet.slug),
      fileS3Key: String(dbMagnet.fileS3Key),
      title: String(dbMagnet.title || ''),
    }
  }

  const fallback = fallbackLeadMagnet()
  if (!fallback || !fallback.fileS3Key) return null
  if (cleanSlug !== fallback.slug) return null

  return {
    id: fallback.id,
    slug: fallback.slug,
    fileS3Key: fallback.fileS3Key,
    title: fallback.title,
  }
}

export async function createLeadMagnetDownload(params: {
  slug: string
  userId: string
  email?: string | null
  source?: string
  path?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const leadMagnet = await resolveDownloadableLeadMagnet(params.slug)
  if (!leadMagnet) return { ok: false as const, status: 404, message: 'Lead magnet not found' }

  const signed = await createSignedGetUrl({ key: leadMagnet.fileS3Key, expiresInSeconds: 60 })

  if (!leadMagnet.id.startsWith('fallback-')) {
    await (prisma as any).leadMagnetDownload.create({
      data: {
        leadMagnetId: leadMagnet.id,
        userId: params.userId,
        source: String(params.source || 'popup'),
      },
    }).catch(() => null)
  }

  await (prisma as any).analyticsEvent.create({
    data: {
      name: 'download_success',
      payload: {
        slug: leadMagnet.slug,
        title: leadMagnet.title,
        source: String(params.source || 'popup'),
      },
      userId: params.userId,
      email: params.email || null,
      path: params.path || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    },
  }).catch(() => null)

  return {
    ok: true as const,
    slug: leadMagnet.slug,
    downloadUrl: signed.url,
    expiresIn: signed.expiresIn,
  }
}
