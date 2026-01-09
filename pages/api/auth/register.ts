import type { NextApiRequest, NextApiResponse } from 'next'
import { mockUsers, mockAgents, mockOTPs } from '@/lib/mockData'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { name, email, password, phone, license, type } = req.body

    if (!name || !email || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    if (type === 'user') {
      // Check if user already exists
      const existingUser = mockUsers.find((u: any) => u.email === email)
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists' })
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      mockOTPs.set(email, {
        otp,
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
      })

      // Store user (in real app, this would be in database)
      mockUsers.push({
        id: `user_${Date.now()}`,
        name,
        email,
        phone: phone || '',
        type: 'user',
        verified: false,
      })

      // In production, send OTP via email
      console.log(`OTP for ${email}: ${otp}`)

      return res.status(200).json({
        success: true,
        message: 'Registration successful. Please verify your email.',
      })
    } else if (type === 'agent') {
      if (!password || !license) {
        return res.status(400).json({ success: false, message: 'Missing required fields for agent' })
      }

      // Check if agent already exists
      const existingAgent = mockAgents.find((a: any) => a.email === email)
      if (existingAgent) {
        return res.status(400).json({ success: false, message: 'Agent already exists' })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Store agent (in real app, this would be in database)
      mockAgents.push({
        id: `agent_${Date.now()}`,
        name,
        email,
        password: hashedPassword,
        phone: phone || '',
        license,
        type: 'agent',
      })

      return res.status(200).json({
        success: true,
        message: 'Agent registration successful. Please login.',
      })
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user type' })
    }
  } catch (error) {
    console.error('Registration error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

