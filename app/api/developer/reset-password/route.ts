import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth/token'
import {
  validatePasswordStrength,
  hashPassword,
  AUTH_ERRORS,
} from '@/lib/auth/shared'

/**
 * POST /api/developer/reset-password
 *
 * Resets password using a valid password reset token.
 * 
 * Request Body:
 * {
 *   token: string,           // Password reset token from email link
 *   password: string,        // New password (must meet strength requirements)
 * }
 *
 * Response (200):
 * {
 *   success: true,
 *   message: "Password reset successfully. Please sign in with your new password."
 * }
 * 
 * Errors:
 * - 400: Invalid input or password doesn't meet requirements
 * - 401: Token invalid or expired
 * - 500: Server error
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!token) {
      return NextResponse.json({ error: 'Password reset token is required' }, { status: 400 })
    }

    // Validate password strength
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

    // Hash token for lookup
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex')

    // Find valid reset token
    let resetToken
    try {
      resetToken = await prisma.passwordResetToken.findFirst({
        where: {
          tokenHash,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      })
    } catch (error) {
      console.error('[developer/reset-password] Database error:', error)
      return NextResponse.json({ error: AUTH_ERRORS.DATABASE_ERROR }, { status: 500 })
    }

    if (!resetToken) {
      return NextResponse.json(
        { error: AUTH_ERRORS.RESET_TOKEN_EXPIRED },
        { status: 401 }
      )
    }

    // Verify user is a developer
    if ((resetToken.user as any).role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Invalid password reset request' },
        { status: 401 }
      )
    }

    // Hash new password
    const passwordHash = await hashPassword(password)

    try {
      // Update password in transaction
      await prisma.$transaction(async (tx) => {
        // Update user password
        await tx.user.update({
          where: { id: resetToken.userId },
          data: { password: passwordHash },
        })

        // Delete all password reset tokens for this user
        await tx.passwordResetToken.deleteMany({
          where: { userId: resetToken.userId },
        })
      })

      return NextResponse.json(
        {
          success: true,
          message: 'Password reset successfully. Please sign in with your new password.',
        },
        { status: 200 }
      )
    } catch (error) {
      console.error('[developer/reset-password] Password update error:', error)
      return NextResponse.json(
        { error: AUTH_ERRORS.RESET_PASSWORD_FAILED },
        { status: 500 }
      )
    }
  } catch (err) {
    console.error('[developer/reset-password] Error:', err)
    return NextResponse.json(
      { error: AUTH_ERRORS.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
