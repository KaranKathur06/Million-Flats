/**
 * auth-settings-service.ts
 *
 * Database-driven authentication configuration with Redis caching.
 * Provides the single source of truth for which auth methods are currently active.
 * Admin changes take effect within seconds without redeployment or restart.
 *
 * Usage:
 *   import { getAuthSettings, isWhatsappEnabled, invalidateAuthSettingsCache } from '@/lib/auth/auth-settings-service'
 */

import { prisma } from '@/lib/prisma'
import { getRedis } from '@/lib/redis'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthSettingsData {
  activeMode: 'EMAIL_ONLY' | 'WHATSAPP_ONLY' | 'EMAIL_AND_WHATSAPP' | 'DISABLED'
  allowEmail: boolean
  allowWhatsapp: boolean
  allowGoogle: boolean
  allowApple: boolean
  allowPasskeys: boolean
  allowRegistration: boolean
  allowForgotPassword: boolean
  requireEmailVerification: boolean
  allowMultipleSessions: boolean
  requireMfa: boolean
  maintenanceMessage: string | null
  updatedAt: string
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const CACHE_KEY = 'auth:settings:v1'
const CACHE_TTL_SECONDS = 30

/** In-memory fallback cache */
let memoryCache: { data: AuthSettingsData; expiresAt: number } | null = null

// ─── SSE subscriber tracking (in-process) ────────────────────────────────────

type SSECallback = (settings: AuthSettingsData) => void
const sseSubscribers = new Set<SSECallback>()

export function subscribeToAuthSettingsChanges(cb: SSECallback): () => void {
  sseSubscribers.add(cb)
  return () => { sseSubscribers.delete(cb) }
}

function notifySubscribers(settings: AuthSettingsData) {
  for (const cb of sseSubscribers) {
    try { cb(settings) } catch { /* ignore individual subscriber errors */ }
  }
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Retrieves auth settings from cache, falling back to database.
 * Caches for 30 seconds in Redis (or in-memory if Redis unavailable).
 */
export async function getAuthSettings(): Promise<AuthSettingsData> {
  // 1. Try Redis cache
  const redis = getRedis()
  if (redis) {
    try {
      const cached = await redis.get(CACHE_KEY)
      if (cached) return JSON.parse(cached) as AuthSettingsData
    } catch { /* fall through */ }
  }

  // 2. Try in-memory cache
  if (memoryCache && memoryCache.expiresAt > Date.now()) {
    return memoryCache.data
  }

  // 3. Fetch from database
  const settings = await fetchFromDatabase()

  // 4. Cache the result
  await cacheSettings(settings)

  return settings
}

/**
 * Updates auth settings in the database, invalidates cache, and notifies SSE subscribers.
 */
export async function updateAuthSettings(
  data: Partial<Omit<AuthSettingsData, 'updatedAt'>>,
  adminUserId: string,
): Promise<AuthSettingsData> {
  const updateData: Record<string, unknown> = { updatedByUserId: adminUserId }

  if (data.activeMode !== undefined) updateData.activeMode = data.activeMode
  if (data.allowEmail !== undefined) updateData.allowEmail = data.allowEmail
  if (data.allowWhatsapp !== undefined) updateData.allowWhatsapp = data.allowWhatsapp
  if (data.allowGoogle !== undefined) updateData.allowGoogle = data.allowGoogle
  if (data.allowApple !== undefined) updateData.allowApple = data.allowApple
  if (data.allowPasskeys !== undefined) updateData.allowPasskeys = data.allowPasskeys
  if (data.allowRegistration !== undefined) updateData.allowRegistration = data.allowRegistration
  if (data.allowForgotPassword !== undefined) updateData.allowForgotPassword = data.allowForgotPassword
  if (data.requireEmailVerification !== undefined) updateData.requireEmailVerification = data.requireEmailVerification
  if (data.allowMultipleSessions !== undefined) updateData.allowMultipleSessions = data.allowMultipleSessions
  if (data.requireMfa !== undefined) updateData.requireMfa = data.requireMfa
  if (data.maintenanceMessage !== undefined) updateData.maintenanceMessage = data.maintenanceMessage

  const updated = await (prisma as any).authSettings.upsert({
    where: { id: 'singleton' },
    update: updateData,
    create: {
      id: 'singleton',
      ...updateData,
    },
  })

  const result = mapToAuthSettingsData(updated)

  // Immediately invalidate cache and notify all SSE subscribers
  await invalidateAuthSettingsCache()
  await cacheSettings(result)
  notifySubscribers(result)

  return result
}

/**
 * Immediately invalidates the cached auth settings.
 * Called after admin saves new settings.
 */
export async function invalidateAuthSettingsCache(): Promise<void> {
  memoryCache = null

  const redis = getRedis()
  if (redis) {
    try {
      await redis.del(CACHE_KEY)
    } catch { /* ignore */ }
  }
}

// ─── Convenience Helpers ─────────────────────────────────────────────────────

export async function isWhatsappEnabled(): Promise<boolean> {
  const settings = await getAuthSettings()
  return settings.allowWhatsapp && (settings.activeMode === 'WHATSAPP_ONLY' || settings.activeMode === 'EMAIL_AND_WHATSAPP')
}

export async function isEmailEnabled(): Promise<boolean> {
  const settings = await getAuthSettings()
  return settings.allowEmail && (settings.activeMode === 'EMAIL_ONLY' || settings.activeMode === 'EMAIL_AND_WHATSAPP')
}

export async function isAuthDisabled(): Promise<boolean> {
  const settings = await getAuthSettings()
  return settings.activeMode === 'DISABLED'
}

// ─── Internal ────────────────────────────────────────────────────────────────

async function fetchFromDatabase(): Promise<AuthSettingsData> {
  try {
    let settings = await (prisma as any).authSettings.findUnique({
      where: { id: 'singleton' },
    })

    // Auto-seed if not exists, but avoid duplicate-create races.
    if (!settings) {
      settings = await (prisma as any).authSettings.upsert({
        where: { id: 'singleton' },
        update: {},
        create: { id: 'singleton' },
      })
    }

    return mapToAuthSettingsData(settings)
  } catch (error) {
    console.error('[auth-settings] Database error, returning defaults:', error)
    return getDefaultSettings()
  }
}

function mapToAuthSettingsData(record: any): AuthSettingsData {
  return {
    activeMode: record.activeMode || 'WHATSAPP_ONLY',
    allowEmail: Boolean(record.allowEmail ?? true),
    allowWhatsapp: Boolean(record.allowWhatsapp ?? true),
    allowGoogle: Boolean(record.allowGoogle ?? false),
    allowApple: Boolean(record.allowApple ?? false),
    allowPasskeys: Boolean(record.allowPasskeys ?? false),
    allowRegistration: Boolean(record.allowRegistration ?? true),
    allowForgotPassword: Boolean(record.allowForgotPassword ?? true),
    requireEmailVerification: Boolean(record.requireEmailVerification ?? true),
    allowMultipleSessions: Boolean(record.allowMultipleSessions ?? true),
    requireMfa: Boolean(record.requireMfa ?? false),
    maintenanceMessage: record.maintenanceMessage || null,
    updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : new Date().toISOString(),
  }
}

function getDefaultSettings(): AuthSettingsData {
  return {
    activeMode: 'WHATSAPP_ONLY',
    allowEmail: true,
    allowWhatsapp: true,
    allowGoogle: false,
    allowApple: false,
    allowPasskeys: false,
    allowRegistration: true,
    allowForgotPassword: true,
    requireEmailVerification: true,
    allowMultipleSessions: true,
    requireMfa: false,
    maintenanceMessage: null,
    updatedAt: new Date().toISOString(),
  }
}

async function cacheSettings(settings: AuthSettingsData): Promise<void> {
  const serialized = JSON.stringify(settings)

  // In-memory cache
  memoryCache = {
    data: settings,
    expiresAt: Date.now() + CACHE_TTL_SECONDS * 1000,
  }

  // Redis cache
  const redis = getRedis()
  if (redis) {
    try {
      await redis.set(CACHE_KEY, serialized, 'EX', CACHE_TTL_SECONDS)
    } catch { /* ignore */ }
  }
}
