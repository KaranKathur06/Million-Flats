/**
 * otp-rate-limiter.ts
 *
 * Layered rate limiting for WhatsApp OTP requests.
 * Redis-backed with in-memory Map fallback when Redis is unavailable.
 *
 * Limits:
 *   - 5 OTP sends / hour / phone
 *   - 10 OTP sends / day / phone
 *   - 20 OTP sends / hour / IP
 *   - 60s cooldown between sends for same phone
 */

import { getRedis } from '@/lib/redis'

// ─── Configuration ───────────────────────────────────────────────────────────

export const OTP_RATE_LIMITS = {
  /** Max OTP sends per phone per hour */
  phonePerHour: 5,
  /** Max OTP sends per phone per day */
  phonePerDay: 10,
  /** Max OTP sends per IP per hour */
  ipPerHour: 20,
  /** Cooldown between sends for same phone (seconds) */
  resendCooldownSeconds: 60,
} as const

// ─── In-Memory Fallback ──────────────────────────────────────────────────────

const memoryStore = new Map<string, { count: number; expiresAt: number }>()

/** Cleanup expired entries every 5 minutes */
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    for (const [key, val] of memoryStore) {
      if (val.expiresAt <= now) memoryStore.delete(key)
    }
  }, 5 * 60 * 1000).unref?.()
}

async function incrMemory(key: string, windowSec: number): Promise<number> {
  const now = Date.now()
  const existing = memoryStore.get(key)
  if (existing && existing.expiresAt > now) {
    existing.count += 1
    return existing.count
  }
  memoryStore.set(key, { count: 1, expiresAt: now + windowSec * 1000 })
  return 1
}

async function getTtlMemory(key: string): Promise<number> {
  const existing = memoryStore.get(key)
  if (!existing) return 0
  const remaining = Math.ceil((existing.expiresAt - Date.now()) / 1000)
  return remaining > 0 ? remaining : 0
}

// ─── Core Rate Limit Functions ───────────────────────────────────────────────

async function increment(key: string, windowSec: number): Promise<number> {
  const redis = getRedis()
  if (redis) {
    try {
      const val = await redis.incr(key)
      if (val === 1) await redis.expire(key, windowSec)
      return val
    } catch {
      // Fall through to in-memory
    }
  }
  return incrMemory(key, windowSec)
}

async function getCooldownTtl(key: string): Promise<number> {
  const redis = getRedis()
  if (redis) {
    try {
      const ttl = await redis.ttl(key)
      return ttl > 0 ? ttl : 0
    } catch {
      // Fall through to in-memory
    }
  }
  return getTtlMemory(key)
}

async function setCooldown(key: string, seconds: number): Promise<void> {
  const redis = getRedis()
  if (redis) {
    try {
      await redis.set(key, '1', 'EX', seconds)
      return
    } catch {
      // Fall through to in-memory
    }
  }
  memoryStore.set(key, { count: 1, expiresAt: Date.now() + seconds * 1000 })
}

// ─── Rate Limit Result ───────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean
  reason?: string
  retryAfterSeconds?: number
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Checks all rate limits for an OTP send request.
 * Returns { allowed: true } if under all limits, or { allowed: false, reason, retryAfterSeconds } if blocked.
 *
 * @param phoneHash - SHA-256 hash of the phone number (never pass raw phone)
 * @param ipAddress - Client IP address
 */
export async function checkOtpSendRateLimit(
  phoneHash: string,
  ipAddress: string,
): Promise<RateLimitResult> {
  // 1. Check resend cooldown
  const cooldownKey = `otp:cooldown:${phoneHash}`
  const cooldownTtl = await getCooldownTtl(cooldownKey)
  if (cooldownTtl > 0) {
    return {
      allowed: false,
      reason: 'Please wait before requesting another code.',
      retryAfterSeconds: cooldownTtl,
    }
  }

  // 2. Check phone hourly limit
  const phoneHourKey = `otp:phone:hour:${phoneHash}`
  const phoneHourCount = await increment(phoneHourKey, 3600)
  if (phoneHourCount > OTP_RATE_LIMITS.phonePerHour) {
    return {
      allowed: false,
      reason: 'Too many verification requests. Please try again later.',
      retryAfterSeconds: 3600,
    }
  }

  // 3. Check phone daily limit
  const phoneDayKey = `otp:phone:day:${phoneHash}`
  const phoneDayCount = await increment(phoneDayKey, 86400)
  if (phoneDayCount > OTP_RATE_LIMITS.phonePerDay) {
    return {
      allowed: false,
      reason: 'Daily verification limit reached. Please try again tomorrow.',
      retryAfterSeconds: 86400,
    }
  }

  // 4. Check IP hourly limit
  const ipHourKey = `otp:ip:hour:${ipAddress}`
  const ipHourCount = await increment(ipHourKey, 3600)
  if (ipHourCount > OTP_RATE_LIMITS.ipPerHour) {
    return {
      allowed: false,
      reason: 'Too many requests from your network. Please try again later.',
      retryAfterSeconds: 3600,
    }
  }

  // 5. Set cooldown for this phone
  await setCooldown(cooldownKey, OTP_RATE_LIMITS.resendCooldownSeconds)

  return { allowed: true }
}

/**
 * Checks rate limit for OTP verification attempts per IP.
 * (Per-OTP attempt limits are enforced in the DB by WhatsappOtpRequest.attempts)
 */
export async function checkOtpVerifyRateLimit(ipAddress: string): Promise<RateLimitResult> {
  const key = `otp:verify:ip:${ipAddress}`
  const count = await increment(key, 900) // 15-minute window
  if (count > 30) {
    return {
      allowed: false,
      reason: 'Too many verification attempts. Please try again later.',
      retryAfterSeconds: 900,
    }
  }
  return { allowed: true }
}
