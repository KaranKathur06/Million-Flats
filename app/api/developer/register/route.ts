import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/developer/register
 *
 * Creates a new user with role=DEVELOPER + an empty DeveloperProfile.
 * Does NOT create a developers row (that only happens post-KYC verification).
 *
 * Body: { email, password, companyName, phone?, phoneCountryCode? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : ''
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : ''
    const phoneCountryCode = typeof body?.phoneCountryCode === 'string' ? body.phoneCountryCode.trim() : ''

    if (!email || !password || !companyName) {
      return NextResponse.json(
        { error: 'email, password and companyName are required' },
        { status: 400 }
      )
    }

    // Check for existing user
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(password, 12)

    // Create user + DeveloperProfile in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          role: 'DEVELOPER',
          emailVerified: false,
        } as any,
      })

      const profile = await (tx as any).developerProfile.create({
        data: {
          userId: user.id,
          companyName,
          phone: phone || null,
          phoneCountryCode: phoneCountryCode || null,
          onboardingStatus: 'REGISTERED',
          kycStatus: 'PENDING',
        },
      })

      // Generate email verification token
      const token = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
      await tx.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      })

      return { user, profile, verificationToken: token }
    })

    // TODO: Send verification email with result.verificationToken
    // await sendDeveloperVerificationEmail(email, result.verificationToken)

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      profileId: result.profile.id,
      message: 'Account created. Please check your email to verify.',
    })
  } catch (err: any) {
    console.error('[developer/register] Error:', err)
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    )
  }
}
