import type { NextApiRequest, NextApiResponse } from 'next'
import { mockUsers, mockAgents, mockOTPs } from '@/lib/mockData'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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

    if (!email || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    if (type === 'user') {
      // Find user
      const user = mockUsers.find((u: any) => u.email === email)
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' })
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      mockOTPs.set(email, {
        otp,
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      })

      // In production, send OTP via email
      console.log(`OTP for ${email}: ${otp}`)

      return res.status(200).json({
        success: true,
        message: 'OTP sent to your email',
        requiresVerification: true,
      })
    } else if (type === 'agent') {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password required' })
      }

      // Find agent
      const agent = mockAgents.find((a: any) => a.email === email)
      if (!agent) {
        return res.status(401).json({ success: false, message: 'Agent not found' })
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, agent.password)
      if (!isValidPassword) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' })
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: agent.id, email: agent.email, type: 'agent' },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // Set cookie
      res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict`)

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
      })
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user type' })
    }
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

