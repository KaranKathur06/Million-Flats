import type { NextApiRequest, NextApiResponse } from 'next'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'
import { prisma } from '@/lib/prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

function roleLabel(role: string) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'AGENT') return 'Agent'
  return 'User'
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string; token?: string; requiresVerification?: boolean }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { name, email, password, phone, license, company, type } = req.body

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''

    if (!name || !normalizedEmail || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    if (type === 'user') {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required' })
      }

      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: { agent: true } })
      if (existingUser) {
        if (existingUser.role === 'AGENT' || existingUser.agent) {
          return res.status(400).json({
            success: false,
            message: `This email is already registered as a ${roleLabel('AGENT')}. Please use a different email.`,
          })
        }

        if (!existingUser.password) {
          const hashedPassword = await bcrypt.hash(password, 10)
          const updated = await prisma.user.update({
            where: { id: existingUser.id },
            data: { password: hashedPassword },
          })

          if (!updated.verified) {
            const otp = Math.floor(100000 + Math.random() * 900000).toString()
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

            await prisma.emailVerificationToken.deleteMany({ where: { userId: updated.id } })
            await prisma.emailVerificationToken.create({
              data: {
                userId: updated.id,
                token: otp,
                expiresAt,
              },
            })

            console.log(`OTP for ${normalizedEmail}: ${otp}`)

            return res.status(200).json({
              success: true,
              message: 'Password set successfully. Please verify your email.',
              requiresVerification: true,
            })
          }

          const token = jwt.sign(
            { id: updated.id, email: updated.email, role: updated.role },
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

          return res.status(200).json({ success: true, message: 'Password set successfully', token })
        }

        const isValidPassword = await bcrypt.compare(password, existingUser.password)
        if (!isValidPassword) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }

        if (!existingUser.verified) {
          const otp = Math.floor(100000 + Math.random() * 900000).toString()
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

          await prisma.emailVerificationToken.deleteMany({ where: { userId: existingUser.id } })
          await prisma.emailVerificationToken.create({
            data: {
              userId: existingUser.id,
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
          { id: existingUser.id, email: existingUser.email, role: existingUser.role },
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

        return res.status(200).json({ success: true, message: 'Login successful', token })
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          phone: phone || null,
          verified: false,
        },
      })

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
        message: 'Registration successful. Please verify your email.',
        requiresVerification: true,
      })
    }

    if (type === 'agent') {
      if (!password || !license) {
        return res.status(400).json({ success: false, message: 'Missing required fields for agent' })
      }

      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: { agent: true } })

      if (existingUser) {
        const existingRole = String(existingUser.role || '').toUpperCase()

        if (existingUser.agent) {
          return res.status(400).json({
            success: false,
            message: `This email is already registered as a ${roleLabel('AGENT')}. Please use a different email.`,
          })
        }

        if (existingRole !== 'AGENT') {
          return res.status(400).json({
            success: false,
            message: `This email is already registered as a ${roleLabel(existingRole)}. Please use a different email.`,
          })
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      if (existingUser?.password) {
        const isValidPassword = await bcrypt.compare(password, existingUser.password)
        if (!isValidPassword) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' })
        }
      }

      const user = existingUser
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: existingUser.name || name,
              password: existingUser.password || hashedPassword,
              phone: existingUser.phone || phone || null,
            },
          })
        : await prisma.user.create({
            data: {
              name,
              email: normalizedEmail,
              password: hashedPassword,
              phone: phone || null,
              role: 'AGENT',
              verified: false,
            },
          })

      await prisma.agent.create({
        data: {
          userId: user.id,
          company: company || null,
          license,
          whatsapp: null,
        },
      })

      return res.status(200).json({
        success: true,
        message: 'Agent registration successful. Please login.',
      })
    }

    return res.status(400).json({ success: false, message: 'Invalid user type' })
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

