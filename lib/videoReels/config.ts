import { prisma } from '@/lib/prisma'

export const DEFAULT_VIDEO_CAMPAIGN_SETTINGS = {
  minFeedCardInterval: 4,
  maxAllocationBps: 10_000,
  defaultFrequencyCap: 1,
  schedulingHorizonDays: 90,
  defaultDailyImpressionCap: null,
  defaultTotalImpressionCap: null,
} as const

export function isVideoReelsEnabled() {
  return String(process.env.VIDEO_REELS_ENABLED || '').trim().toLowerCase() === 'true'
}

export function isVideoCampaignPaymentsEnabled() {
  return isVideoReelsEnabled()
    && String(process.env.VIDEO_CAMPAIGNS_PAYMENTS_ENABLED || '').trim().toLowerCase() === 'true'
}

export function getConfiguredVideoCampaignTaxRateBps() {
  const rawTaxRate = process.env.VIDEO_CAMPAIGN_TAX_RATE_BPS
  if (rawTaxRate === undefined || rawTaxRate.trim() === '') return null
  const taxRateBps = Number(rawTaxRate)
  if (!Number.isSafeInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10_000) return null
  return taxRateBps
}

export type HouseReel = {
  id: string
  title: string
  caption?: string
  videoUrl: string
  posterUrl?: string
}

export function getHouseReels(): HouseReel[] {
  const raw = String(process.env.VIDEO_REELS_HOUSE_FALLBACK || '').trim()
  if (!raw) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) throw new Error('House reel fallback must be a JSON array')
    return parsed.flatMap((item, index) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return []
      const reel = item as Record<string, unknown>
      const videoUrl = typeof reel.videoUrl === 'string' ? reel.videoUrl : ''
      let url: URL
      try {
        url = new URL(videoUrl)
      } catch {
        return []
      }
      if (url.protocol !== 'https:' || url.username || url.password) return []
      if (typeof reel.title !== 'string' || !reel.title.trim()) return []
      const posterUrl = typeof reel.posterUrl === 'string' ? reel.posterUrl : undefined
      if (posterUrl) {
        try {
          const poster = new URL(posterUrl)
          if (poster.protocol !== 'https:' || poster.username || poster.password) return []
        } catch {
          return []
        }
      }
      return [{
        id: `house-${index}`,
        title: reel.title.trim().slice(0, 120),
        caption: typeof reel.caption === 'string' ? reel.caption.slice(0, 500) : undefined,
        videoUrl: url.toString(),
        posterUrl,
      }]
    })
  } catch (error) {
    console.error('Video house fallback configuration is invalid', error)
    return []
  }
}

export async function getVideoCampaignSettings() {
  const settings = await prisma.videoCampaignSettings.findUnique({ where: { id: 'global' } })
  return settings || DEFAULT_VIDEO_CAMPAIGN_SETTINGS
}

export function parseBoundedPositiveInt(value: string | undefined, fallback: number, max: number) {
  if (value === undefined || value.trim() === '') return fallback
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    throw new Error('Invalid video feature configuration')
  }
  return parsed
}
