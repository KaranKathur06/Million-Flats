import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth/token'
import { VerificationService } from '@/lib/auth/verification-service'
import crypto from 'crypto'
import {
  validateAndNormalizeEmail,
  validatePasswordStrength,
  hashPassword,
  checkEmailUniqueness,
  checkPhoneUniqueness,
  checkAgencyNameUniqueness,
  AUTH_ERRORS,
} from '@/lib/auth/shared'

/**
 * POST /api/agency/register
 *
 * Creates a new user with role=AGENCY + AgencyProfile.
 * 
 * Unified Email + Password Authentication (replaces WhatsApp OTP)
 *
 * Request Body:
 * {
 *   email: string,           // Business email (unique)
 *   password: string,        // 8+ chars, uppercase, lowercase, number, special char
 *   agencyName: string,      // Agency name (unique)
 *   phone?: string,          // Business phone (optional but recommended)
 *   phoneCountryCode?: string, // e.g., "AE", "IN", etc (optional)
 *   country?: string,        // Optional
 *   state?: string,          // Optional
 *   city?: string,           // Optional
 *   website?: string,        // Optional
 * }
 *
 * Response (201):
 * {
 *   success: true,
 *   userId: string,
 *   agencyProfileId: string,
 *   message: "Account created. Please verify your email to continue."
 * }
 * 
 * Error Responses:
 * - 400: Validation error (missing required fields, weak password, etc)
 * - 409: Email/agency name already registered
 * - 500: Server error
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ──── Input Extraction & Normalization ────
    const email = typeof body?.email === 'string' ? body.email : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const agencyName = typeof body?.agencyName === 'string' ? body.agencyName.trim() : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const phoneCountryCode = typeof body?.phoneCountryCode === 'string' ? body.phoneCountryCode.trim() : ''
    const country = typeof body?.country === 'string' ? body.country.trim() : null
    const state = typeof body?.state === 'string' ? body.state.trim() : null
    const city = typeof body?.city === 'string' ? body.city.trim() : null
    const website = typeof body?.website === 'string' ? body.website.trim() : null

    // ──── Email Validation ────
    const emailValidation = validateAndNormalizeEmail(email)
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 })
    }
    const normalizedEmail = emailValidation.normalized

    // ──── Password Validation ────
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: 'Password does not meet security requirements',
          details: passwordValidation.errors,
        },
        { status: 400 }
      )
    }

    // ──── Agency Name Validation ────
    if (!agencyName) {
      return NextResponse.json({ error: AUTH_ERRORS.AGENCY_NAME_REQUIRED }, { status: 400 })
    }

    // ──── Check Email Uniqueness ────
    const emailCheck = await checkEmailUniqueness(normalizedEmail)
    if (!emailCheck.available) {
      return NextResponse.json(
        { error: AUTH_ERRORS.EMAIL_ALREADY_EXISTS },
        { status: 409 }
      )
    }

    // ──── Check Phone Uniqueness (if provided) ────
    if (phone && phoneCountryCode) {
      const phoneUnique = await checkPhoneUniqueness(phone, phoneCountryCode)
      if (!phoneUnique) {
        return NextResponse.json(
          { error: AUTH_ERRORS.PHONE_ALREADY_EXISTS },
          { status: 409 }
        )
      }
    }

    // ──── Check Agency Name Uniqueness ────
    const agencyUnique = await checkAgencyNameUniqueness(agencyName)
    if (!agencyUnique) {
      return NextResponse.json(
        { error: AUTH_ERRORS.AGENCY_NAME_TAKEN },
        { status: 409 }
      )
    }

    // ──── Hash Password ────
    const passwordHash = await hashPassword(password)

    // ──── Create User + AgencyProfile in Transaction ────
    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: passwordHash,
          phone: phone || null,
          role: 'AGENCY',
          name: agencyName,
          status: 'ACTIVE',
          emailVerified: false,
          lastLogin: null,
        } as any,
      })

      // Create AgencyProfile
      const agencyProfile = await (tx as any).agencyProfile.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          agencyName,
          email: normalizedEmail,
          phone: phone || null,
          phoneCountryCode: phoneCountryCode || null,
          country: country,
          state: state,
          city: city,
          website: website,
          onboardingStatus: 'REGISTERED',
          kycStatus: 'PENDING',
          isVerified: false,
          profileCompletion: 0,
        },
      })

      return { user, agencyProfile }
    })

    // Send OTP via VerificationService
    const otpResult = await VerificationService.sendRegistrationOtp(normalizedEmail, 'AGENCY')
    if (!otpResult.success) {
      // Log warning but don't fail registration - user can resend OTP
      console.warn('[agency/register] Failed to send OTP:', otpResult.message)
    }

    return NextResponse.json(
      {
        success: true,
        userId: result.user.id,
        agencyProfileId: result.agencyProfile.id,
        message: 'Account created. Please verify your email to continue.',
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[agency/register]', error)

    // Prisma-specific error handling
    if (error.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta?.target?.[0]
      const fieldNames: Record<string, string> = {
        email: AUTH_ERRORS.EMAIL_ALREADY_EXISTS,
        agency_name: AUTH_ERRORS.AGENCY_NAME_TAKEN,
        phone: AUTH_ERRORS.PHONE_ALREADY_EXISTS,
      }
      const message = fieldNames[field] || 'Registration failed. This information is already registered.'
      return NextResponse.json({ error: message }, { status: 409 })
    }

    // Generic error response (never expose DB errors)
    return NextResponse.json(
      { error: AUTH_ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
