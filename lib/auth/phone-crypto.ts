/**
 * phone-crypto.ts
 *
 * Enterprise-grade phone number encryption and hashing.
 * - SHA-256 deterministic hash for indexed lookup (phoneHash)
 * - AES-256-GCM authenticated encryption for storing the original phone (phoneEncrypted)
 *
 * Usage:
 *   import { hashPhone, encryptPhone, decryptPhone, maskPhone } from '@/lib/auth/phone-crypto'
 */

import crypto from 'crypto'

// ─── Configuration ───────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12     // 96-bit IV recommended for GCM
const TAG_LENGTH = 16    // 128-bit auth tag
const ENCODING = 'base64' as const

function getEncryptionKey(): Buffer {
  const key = process.env.PHONE_ENCRYPTION_KEY
  if (!key || key.length < 32) {
    throw new Error('[phone-crypto] PHONE_ENCRYPTION_KEY must be a 32+ character hex string')
  }
  // If hex string (64 chars = 32 bytes), parse as hex. Otherwise use first 32 bytes of UTF-8.
  if (/^[0-9a-f]{64}$/i.test(key)) {
    return Buffer.from(key, 'hex')
  }
  return Buffer.from(key.slice(0, 32), 'utf8')
}

// ─── Deterministic Hash (for lookup) ─────────────────────────────────────────

/**
 * Creates a deterministic SHA-256 hash of a phone number in E.164 format.
 * Used for indexed lookups without exposing the raw phone number.
 *
 * @param phone - E.164 format phone number (e.g. "+919876543210")
 * @returns Hex-encoded SHA-256 hash
 */
export function hashPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

// ─── AES-256-GCM Encryption ─────────────────────────────────────────────────

/**
 * Encrypts a phone number using AES-256-GCM.
 * Returns a base64 string containing: iv + authTag + ciphertext
 *
 * @param phone - E.164 format phone number
 * @returns Base64-encoded encrypted string
 */
export function encryptPhone(phone: string): string {
  const key = getEncryptionKey()
  const normalized = normalizePhone(phone)
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  const encrypted = Buffer.concat([
    cipher.update(normalized, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  // Pack: iv (12) + authTag (16) + ciphertext (variable)
  const packed = Buffer.concat([iv, authTag, encrypted])
  return packed.toString(ENCODING)
}

/**
 * Decrypts a phone number previously encrypted with encryptPhone().
 *
 * @param encrypted - Base64-encoded encrypted string from encryptPhone()
 * @returns Decrypted E.164 phone number
 */
export function decryptPhone(encrypted: string): string {
  const key = getEncryptionKey()
  const packed = Buffer.from(encrypted, ENCODING)

  if (packed.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('[phone-crypto] Invalid encrypted phone data (too short)')
  }

  const iv = packed.subarray(0, IV_LENGTH)
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const ciphertext = packed.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH })
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

// ─── Phone Utilities ─────────────────────────────────────────────────────────

/**
 * Normalizes phone to E.164 format: strips spaces/dashes, ensures starts with +
 */
export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '').trim()
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned
  }
  return cleaned
}

/**
 * Validates that a phone number is in E.164 format.
 * E.164: + followed by 7-15 digits
 */
export function isValidE164(phone: string): boolean {
  const normalized = normalizePhone(phone)
  return /^\+[1-9]\d{6,14}$/.test(normalized)
}

/**
 * Masks a phone number for display. E.g. "+919876543210" → "+91 **** ** 3210"
 */
export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone)
  if (normalized.length < 8) return normalized.replace(/.(?=.{2})/g, '*')

  const countryCode = normalized.slice(0, normalized.length > 12 ? 3 : 2 + (normalized.length > 10 ? 1 : 0))
  const lastFour = normalized.slice(-4)
  const middleLen = normalized.length - countryCode.length - lastFour.length
  const masked = '*'.repeat(middleLen)

  // Format: +91 **** **** 3210
  return `${countryCode} ${masked.replace(/(.{4})/g, '$1 ').trim()} ${lastFour}`
}
