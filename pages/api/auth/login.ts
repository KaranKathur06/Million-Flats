import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string; token?: string; requiresVerification?: boolean }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { email, password, type } = req.body

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!normalizedEmail || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    if (type === 'user') {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required' })
      }

      const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' })
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: 'This account does not have a password set. Please sign in with Google or set a password.',
        })
      }

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
      }

      if (!user.verified) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

        await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })
        await prisma.emailVerificationToken.create({
          data: {
            userId: user.id,
            token: otp,
            expiresAt,
          },
        })

        console.log(`OTP for ${normalizedEmail}: ${otp}`)

        return res.status(200).json({
          success: true,
          message: 'OTP sent to your email',
          requiresVerification: true,
        })
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.setHeader(
        'Set-Cookie',
        serialize('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
      )

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
      })
    }

    if (type === 'agent') {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required' })
      }

      const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: { agent: true } })
      if (!user || !user.agent) {
        return res.status(401).json({ success: false, message: 'Agent not found' })
      }

      if (!user.password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
      }

      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      res.setHeader(
        'Set-Cookie',
        serialize('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
      )

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
      })
    }

    return res.status(400).json({ success: false, message: 'Invalid user type' })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

