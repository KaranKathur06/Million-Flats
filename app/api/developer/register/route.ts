import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VerificationService } from '@/lib/auth/verification-service'
import { createDeveloperLifecycle } from '@/lib/lifecycle/partnerLifecycle'
import {
  validateAndNormalizeEmail,
  validatePasswordStrength,
  hashPassword,
  checkEmailUniqueness,
  checkPhoneUniqueness,
  checkDeveloperCompanyNameUniqueness,
  AUTH_ERRORS,
} from '@/lib/auth/shared'

/**
 * POST /api/developer/register
 *
 * Creates a new user with role=DEVELOPER + DeveloperProfile.
 * 
 * Unified Email + Password Authentication (replaces WhatsApp OTP)
 *
 * Request Body:
 * {
 *   email: string,           // Business email (unique)
 *   password: string,        // 8+ chars, uppercase, lowercase, number, special char
 *   companyName: string,     // Company name (unique)
 *   phone?: string,          // Business phone (optional but recommended)
 *   phoneCountryCode?: string, // e.g., "AE", "IN", etc (optional)
 * }
 *
 * Response (201):
 * {
 *   success: true,
 *   userId: string,
 *   profileId: string,
 *   message: "Account created. Please verify your email to continue."
 * }
 * 
 * Error Responses:
 * - 400: Validation error (missing required fields, weak password, etc)
 * - 409: Email/company already registered
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // ──── Input Extraction & Normalization ────
    const email = typeof body?.email === 'string' ? body.email : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const phoneCountryCode = typeof body?.phoneCountryCode === 'string' ? body.phoneCountryCode.trim() : ''
    const website = typeof body?.website === 'string' ? body.website.trim() : ''
    const countryIso2 = typeof body?.countryIso2 === 'string' ? body.countryIso2.trim().toUpperCase() : ''
    const city = typeof body?.city === 'string' ? body.city.trim() : ''

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

    // ──── Company Name Validation ────
    if (!companyName) {
      return NextResponse.json({ error: AUTH_ERRORS.COMPANY_NAME_REQUIRED }, { status: 400 })
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

    // ──── Check Company Name Uniqueness ────
    const companyUnique = await checkDeveloperCompanyNameUniqueness(companyName)
    if (!companyUnique) {
      return NextResponse.json(
        { error: AUTH_ERRORS.COMPANY_NAME_TAKEN },
        { status: 409 }
      )
    }

    // ──── Hash Password ────
    const passwordHash = await hashPassword(password)

    // ──── Create User + DeveloperProfile + Developer in Transaction ────
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: passwordHash,
          role: 'DEVELOPER',
          emailVerified: false,
          phone: phone || null,
          status: 'ACTIVE',
          lastLogin: null,
        } as any,
      })

      const lifecycle = await createDeveloperLifecycle(tx as any, {
        userId: user.id,
        email: normalizedEmail,
        companyName,
        phone: phone || null,
        phoneCountryCode: phoneCountryCode || null,
        website: website || null,
        countryIso2: countryIso2 || null,
        city: city || null,
        source: 'SELF_REGISTRATION',
      })

      return { user, profile: lifecycle.profile, developer: lifecycle.developer }
    })

    // Send OTP via VerificationService
    const otpResult = await VerificationService.sendRegistrationOtp(normalizedEmail, 'DEVELOPER')
    if (!otpResult.success) {
      // Log warning but don't fail registration - user can resend OTP
      console.warn('[developer/register] Failed to send OTP:', otpResult.message)
    }

    return NextResponse.json(
      {
        success: true,
        userId: result.user.id,
        profileId: result.profile.id,
        developerId: result.developer.id,
        message: 'Account created. Please verify your email to continue.',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('[developer/register] Error:', err)

    // Prisma-specific error handling
    if (err.code === 'P2002') {
      // Unique constraint violation
      const field = err.meta?.target?.[0]
      const fieldNames: Record<string, string> = {
        email: AUTH_ERRORS.EMAIL_ALREADY_EXISTS,
        company_name: AUTH_ERRORS.COMPANY_NAME_TAKEN,
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
