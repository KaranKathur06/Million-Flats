import type { NextApiRequest, NextApiResponse } from 'next'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string; token?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { email, otp, type } = req.body

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const normalizedOtp = typeof otp === 'string' ? otp.trim() : ''

    if (!normalizedEmail || !normalizedOtp || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    if (type !== 'user') {
      return res.status(400).json({ success: false, message: 'Invalid user type' })
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' })
    }

    const tokenRow = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, token: normalizedOtp },
      orderBy: { createdAt: 'desc' },
    })

    if (!tokenRow) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' })
    }

    if (tokenRow.expiresAt.getTime() < Date.now()) {
      await prisma.emailVerificationToken.delete({ where: { id: tokenRow.id } })
      return res.status(400).json({ success: false, message: 'OTP expired' })
    }

    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { verified: true },
    })

    await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })

    const jwtToken = jwt.sign(
      { id: verifiedUser.id, email: verifiedUser.email, role: verifiedUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.setHeader(
      'Set-Cookie',
      serialize('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    )

    return res.status(200).json({
      success: true,
      message: 'Verification successful',
      token: jwtToken,
    })
  } catch (error) {
    console.error('Verification error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

