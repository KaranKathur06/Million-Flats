import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { signToken } from '@/lib/auth/token'
import { validateAndNormalizeEmail, AUTH_ERRORS } from '@/lib/auth/shared'

/**
 * POST /api/developer/forgot-password
 *
 * Initiates password reset flow for Developer accounts.
 * 
 * Request Body:
 * {
 *   email: string,  // Developer's business email
 * }
 *
 * Response (200):
 * {
 *   success: true,
 *   message: "Password reset link sent to your email. Check your inbox."
 * }
 * 
 * Errors:
 * - 400: Invalid/missing email
 * - 404: Email not found
 * - 500: Server error
 * 
 * Important: Always return success message even if email not found (security).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = typeof body?.email === 'string' ? body.email : ''

    // Validate email format
    const emailValidation = validateAndNormalizeEmail(email)
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 })
    }

    const normalizedEmail = emailValidation.normalized

    // Find user by email
    let user
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
    } catch (error) {
      console.error('[developer/forgot-password] Database error:', error)
      // Return generic success (security: don't reveal if email exists)
      return NextResponse.json(
        { success: true, message: 'Password reset link sent to your email. Check your inbox.' },
        { status: 200 }
      )
    }

    // Security: Return generic success even if email not found
    if (!user || (user as any).role !== 'DEVELOPER') {
      return NextResponse.json(
        { success: true, message: 'Password reset link sent to your email. Check your inbox.' },
        { status: 200 }
      )
    }

    try {
      // Generate password reset token (valid for 24 hours)
      const tokenRaw = crypto.randomBytes(32).toString('hex')
      const tokenHash = signToken(tokenRaw)

      // Create or update password reset token
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      })

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      })

      // TODO: Send password reset email
      // const resetUrl = `${process.env.NEXTAUTH_URL}/developer/reset-password?token=${tokenRaw}`
      // await sendDeveloperPasswordResetEmail(user.email, resetUrl)

      return NextResponse.json(
        { success: true, message: 'Password reset link sent to your email. Check your inbox.' },
        { status: 200 }
      )
    } catch (error) {
      console.error('[developer/forgot-password] Token creation error:', error)
      // Still return success (email sending is async anyway)
      return NextResponse.json(
        { success: true, message: 'Password reset link sent to your email. Check your inbox.' },
        { status: 200 }
      )
    }
  } catch (err) {
    console.error('[developer/forgot-password] Error:', err)
    return NextResponse.json(
      { error: AUTH_ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
