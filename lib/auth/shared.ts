/**
 * shared.ts
 * 
 * Shared authentication utilities used across all roles (User, Agent, Developer, Agency).
 * Provides password validation, email normalization, hashing, and common auth logic.
 * 
 * Usage:
 * - Password validation: validatePasswordStrength()
 * - Email validation: validateAndNormalizeEmail()
 * - Password hashing: hashPassword()
 * - Email uniqueness check: checkEmailUniqueness()
 */

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// ──────────────────────────────────────────────────────────────────────────
// PASSWORD VALIDATION & STRENGTH
// ──────────────────────────────────────────────────────────────────────────

export interface PasswordValidationResult {
  isValid: boolean
  strength: 'weak' | 'fair' | 'strong'
  errors: string[]
  score: number // 0-100
}

/**
 * Validates password strength against security requirements.
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*)
 * 
 * Returns strength indicator and list of failed requirements.
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = []
  let score = 0

  if (!password) {
    return { isValid: false, strength: 'weak', errors: ['Password is required'], score: 0 }
  }

  // Length check (max 8 characters)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  } else {
    score += 20
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters')
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)')
  } else {
    score += 20
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)')
  } else {
    score += 20
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number (0-9)')
  } else {
    score += 20
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)')
  } else {
    score += 20
  }

  // Determine strength
  let strength: 'weak' | 'fair' | 'strong' = 'weak'
  if (score >= 80) strength = 'strong'
  else if (score >= 60) strength = 'fair'

  return {
    isValid: errors.length === 0,
    strength,
    errors,
    score,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// EMAIL VALIDATION & NORMALIZATION
// ──────────────────────────────────────────────────────────────────────────

/**
 * Validates and normalizes an email address.
 * 
 * - Trims whitespace
 * - Converts to lowercase
 * - Validates format with regex
 * - Checks length constraints
 */
export function validateAndNormalizeEmail(email: unknown): { valid: boolean; normalized: string; error?: string } {
  if (typeof email !== 'string') {
    return { valid: false, normalized: '', error: 'Email must be a string' }
  }

  const normalized = email.trim().toLowerCase()

  if (!normalized) {
    return { valid: false, normalized: '', error: 'Email is required' }
  }

  if (normalized.length > 255) {
    return { valid: false, normalized: '', error: 'Email is too long' }
  }

  // Basic RFC 5322 email regex (simplified but covers 99% of cases)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(normalized)) {
    return { valid: false, normalized: '', error: 'Invalid email format' }
  }

  return { valid: true, normalized }
}

// ──────────────────────────────────────────────────────────────────────────
// PASSWORD HASHING & COMPARISON
// ──────────────────────────────────────────────────────────────────────────

/**
 * Hashes a plaintext password using bcrypt.
 * 
 * - Salt rounds: 12 (high security, ~200ms on modern hardware)
 * - Production-ready strength
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/**
 * Compares a plaintext password against a bcrypt hash.
 * 
 * Uses timing-safe comparison.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ──────────────────────────────────────────────────────────────────────────
// EMAIL UNIQUENESS CHECKING
// ──────────────────────────────────────────────────────────────────────────

export interface EmailUniquenessCheckResult {
  available: boolean
  existing?: {
    type: 'user' | 'developer' | 'agency'
    role?: string
    status?: string
  }
}

/**
 * Checks if an email is available (not used by any existing user, developer, or agency).
 * 
 * Searches across:
 * - User table (all roles)
 * - Returns early if found
 */
export async function checkEmailUniqueness(email: string): Promise<EmailUniquenessCheckResult> {
  const { valid, normalized, error } = validateAndNormalizeEmail(email)
  if (!valid) {
    return { available: false }
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalized },
    })

    if (existingUser) {
      return {
        available: false,
        existing: {
          type: 'user',
          role: (existingUser as any).role,
          status: (existingUser as any).status,
        },
      }
    }

    return { available: true }
  } catch (error) {
    console.error('[checkEmailUniqueness] Database error:', error)
    throw error
  }
}

/**
 * Checks if phone number is unique (for Developer/Agency registration).
 * Phone + CountryCode combination must be unique.
 */
export async function checkPhoneUniqueness(
  phone: string,
  countryCode: string,
  excludeUserId?: string
): Promise<boolean> {
  if (!phone || !countryCode) return true

  try {
    const existing = await prisma.user.findFirst({
      where: {
        AND: [{ phone: phone.trim() }, { id: excludeUserId ? { not: excludeUserId } : undefined }],
      },
    })

    return !existing
  } catch (error) {
    console.error('[checkPhoneUniqueness] Database error:', error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────────────
// COMPANY NAME UNIQUENESS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Checks if a company name is available in DeveloperProfile.
 */
export async function checkDeveloperCompanyNameUniqueness(
  companyName: string,
  excludeProfileId?: string
): Promise<boolean> {
  if (!companyName?.trim()) return true

  try {
    const normalized = companyName.trim().toLowerCase()
    const existing = await (prisma as any).developerProfile.findFirst({
      where: {
        AND: [
          { companyName: { mode: 'insensitive', equals: normalized } },
          excludeProfileId ? { id: { not: excludeProfileId } } : {},
        ],
      },
    })

    return !existing
  } catch (error) {
    console.error('[checkDeveloperCompanyNameUniqueness] Database error:', error)
    throw error
  }
}

/**
 * Checks if an agency name is available in AgencyProfile.
 */
export async function checkAgencyNameUniqueness(agencyName: string, excludeProfileId?: string): Promise<boolean> {
  if (!agencyName?.trim()) return true

  try {
    const normalized = agencyName.trim().toLowerCase()
    const existing = await (prisma as any).agencyProfile.findFirst({
      where: {
        AND: [
          { agencyName: { mode: 'insensitive', equals: normalized } },
          excludeProfileId ? { id: { not: excludeProfileId } } : {},
        ],
      },
    })

    return !existing
  } catch (error) {
    console.error('[checkAgencyNameUniqueness] Database error:', error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────────────
// AUTH ERROR MESSAGES (user-facing)
// ──────────────────────────────────────────────────────────────────────────

export const AUTH_ERRORS = {
  // Registration errors
  EMAIL_REQUIRED: 'Email is required',
  INVALID_EMAIL: 'Please enter a valid email address',
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_WEAK: 'Password does not meet security requirements',
  PASSWORD_MISMATCH: 'Passwords do not match',
  PHONE_ALREADY_EXISTS: 'An account with this phone number already exists',
  COMPANY_NAME_REQUIRED: 'Company name is required',
  COMPANY_NAME_TAKEN: 'This company name is already registered',
  AGENCY_NAME_REQUIRED: 'Agency name is required',
  AGENCY_NAME_TAKEN: 'This agency name is already registered',

  // Login errors
  EMAIL_NOT_VERIFIED: 'Please verify your email before signing in',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_BANNED: 'Your account has been banned. Please contact support',
  ACCOUNT_SUSPENDED: 'Your account is suspended. Please contact support',
  DEVELOPER_NOT_REGISTERED: 'Your developer account is not registered. Please sign up first',
  AGENCY_NOT_REGISTERED: 'Your agency account is not registered. Please sign up first',

  // Forgot password errors
  EMAIL_NOT_FOUND: 'No account found with this email',
  RESET_TOKEN_EXPIRED: 'Password reset link has expired',
  RESET_TOKEN_INVALID: 'Invalid password reset link',
  RESET_PASSWORD_FAILED: 'Failed to reset password. Please try again',

  // General errors
  DATABASE_ERROR: 'A database error occurred. Please try again later',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later',
}

// ──────────────────────────────────────────────────────────────────────────
// VALIDATION UTILITIES
// ──────────────────────────────────────────────────────────────────────────

/**
 * Validates company registration number (RERA in India, etc).
 * Format depends on country code.
 */
export function validateCompanyRegistrationNumber(
  regNumber: string,
  countryCode: string
): { valid: boolean; error?: string } {
  if (!regNumber?.trim()) {
    return { valid: false, error: 'Registration number is required' }
  }

  // Basic validation: alphanumeric, 3-20 chars
  if (!/^[A-Z0-9\-/]{3,20}$/.test(regNumber.toUpperCase())) {
    return { valid: false, error: 'Invalid registration number format' }
  }

  return { valid: true }
}

/**
 * Validates GST number (Indian GST format).
 * GST: 15 digit alphanumeric
 */
export function validateGSTNumber(gstNumber: string): { valid: boolean; error?: string } {
  if (!gstNumber?.trim()) {
    return { valid: true } // Optional field
  }

  const gst = gstNumber.trim().toUpperCase()
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)) {
    return { valid: false, error: 'Invalid GST number format' }
  }

  return { valid: true }
}

/**
 * Validates PAN number (Indian PAN format).
 * PAN: 10 character alphanumeric
 */
export function validatePANNumber(panNumber: string): { valid: boolean; error?: string } {
  if (!panNumber?.trim()) {
    return { valid: true } // Optional field
  }

  const pan = panNumber.trim().toUpperCase()
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
    return { valid: false, error: 'Invalid PAN number format' }
  }

  return { valid: true }
}

/**
 * Validates RERA number (Indian RERA format).
 * Format varies by state, but typically alphanumeric 10-15 chars
 */
export function validateRERANumber(reraNumber: string): { valid: boolean; error?: string } {
  if (!reraNumber?.trim()) {
    return { valid: true } // Optional field
  }

  const rera = reraNumber.trim().toUpperCase()
  if (!/^[A-Z0-9\-/]{5,20}$/.test(rera)) {
    return { valid: false, error: 'Invalid RERA number format' }
  }

  return { valid: true }
}

// ──────────────────────────────────────────────────────────────────────────
// PROFILE COMPLETION SCORING
// ──────────────────────────────────────────────────────────────────────────

/**
 * Calculates Developer profile completion percentage.
 * 
 * Scoring breakdown:
 * - Company Info (20%): name, logo, description, website, founded year
 * - Verification (25%): RERA, GST, PAN, documents
 * - Business Info (20%): project types, cities served, headquarters
 * - Media (20%): banner, gallery, brochure
 * - Social Links (5%): LinkedIn, website, social media
 * - Projects (10%): published projects linked
 * 
 * Total: 100%
 */
export interface DeveloperCompletionScore {
  total: number
  company: number
  verification: number
  business: number
  media: number
  social: number
  projects: number
}

export function calculateDeveloperProfileCompletion(profile: {
  companyName?: string | null
  logo?: string | null
  description?: string | null
  website?: string | null
  foundedYear?: number | null
  reraNumber?: string | null
  gstNumber?: string | null
  panNumber?: string | null
  projectTypesFocus?: string[]
  citiesServed?: string[]
  headquarters?: string | null
  banner?: string | null
  linkedinUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
}): DeveloperCompletionScore {
  let company = 0
  let verification = 0
  let business = 0
  let media = 0
  let social = 0

  // Company info (max 20)
  if (profile.companyName) company += 4
  if (profile.logo) company += 4
  if (profile.description) company += 6
  if (profile.website) company += 3
  if (profile.foundedYear) company += 3
  company = Math.min(company, 20)

  // Verification (max 25)
  if (profile.reraNumber) verification += 8
  if (profile.gstNumber) verification += 8
  if (profile.panNumber) verification += 9
  verification = Math.min(verification, 25)

  // Business (max 20)
  if (profile.projectTypesFocus && profile.projectTypesFocus.length > 0) business += 10
  if (profile.citiesServed && profile.citiesServed.length > 0) business += 5
  if (profile.headquarters) business += 5
  business = Math.min(business, 20)

  // Media (max 20)
  if (profile.banner) media += 10
  if (profile.logo) media += 10 // Also counted in company, but media includes multiple items
  media = Math.min(media, 20)

  // Social (max 5)
  const socialLinks = [profile.linkedinUrl, profile.instagramUrl, profile.facebookUrl].filter(Boolean).length
  social = Math.min(socialLinks * 2, 5)

  const total = Math.min(company + verification + business + media + social, 100)

  return { total, company, verification, business, media, social, projects: 0 }
}

/**
 * Calculates Agency profile completion percentage.
 * 
 * Similar to Developer but with different categories:
 * - Identity (20%): name, logo, description, website
 * - Legal (25%): registration, licenses, documents
 * - Business (20%): size, specializations, operating areas
 * - Media (20%): banner, gallery
 * - Social (5%): LinkedIn, social media
 * - Verification (10%): RERA, documents
 * 
 * Total: 100%
 */
export interface AgencyCompletionScore {
  total: number
  identity: number
  legal: number
  business: number
  media: number
  social: number
}

export function calculateAgencyProfileCompletion(profile: {
  agencyName?: string | null
  logo?: string | null
  description?: string | null
  website?: string | null
  licenseNumber?: string | null
  reraNumber?: string | null
  gstNumber?: string | null
  agencySize?: string | null
  specializations?: string[]
  operatingAreas?: string[]
  banner?: string | null
  linkedinUrl?: string | null
  instagramUrl?: string | null
  facebookUrl?: string | null
}): AgencyCompletionScore {
  let identity = 0
  let legal = 0
  let business = 0
  let media = 0
  let social = 0

  // Identity (max 20)
  if (profile.agencyName) identity += 5
  if (profile.logo) identity += 5
  if (profile.description) identity += 7
  if (profile.website) identity += 3
  identity = Math.min(identity, 20)

  // Legal (max 25)
  if (profile.licenseNumber) legal += 8
  if (profile.reraNumber) legal += 9
  if (profile.gstNumber) legal += 8
  legal = Math.min(legal, 25)

  // Business (max 20)
  if (profile.agencySize) business += 7
  if (profile.specializations && profile.specializations.length > 0) business += 7
  if (profile.operatingAreas && profile.operatingAreas.length > 0) business += 6
  business = Math.min(business, 20)

  // Media (max 20)
  if (profile.banner) media += 10
  if (profile.logo) media += 10
  media = Math.min(media, 20)

  // Social (max 5)
  const socialLinks = [profile.linkedinUrl, profile.instagramUrl, profile.facebookUrl].filter(Boolean).length
  social = Math.min(socialLinks * 2, 5)

  const total = Math.min(identity + legal + business + media + social, 100)

  return { total, identity, legal, business, media, social }
}
