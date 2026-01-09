import type { NextApiRequest, NextApiResponse } from 'next'
import { mockUsers, mockOTPs } from '@/lib/mockData'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string; token?: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { email, otp, type } = req.body

    if (!email || !otp || !type) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    if (type === 'user') {
      // Verify OTP
      const storedOTP = mockOTPs.get(email)
      if (!storedOTP) {
        return res.status(400).json({ success: false, message: 'OTP not found or expired' })
      }

      if (Date.now() > storedOTP.expires) {
        mockOTPs.delete(email)
        return res.status(400).json({ success: false, message: 'OTP expired' })
      }

      if (storedOTP.otp !== otp) {
        return res.status(400).json({ success: false, message: 'Invalid OTP' })
      }

      // OTP verified, update user and generate token
      const user = mockUsers.find((u: any) => u.email === email)
      if (user) {
        user.verified = true
      }

      // Remove OTP
      mockOTPs.delete(email)

      // Generate JWT token
      const token = jwt.sign(
        { id: user?.id || email, email, type: 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      // Set cookie
      res.setHeader('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Strict`)

      return res.status(200).json({
        success: true,
        message: 'Verification successful',
        token,
      })
    } else {
      return res.status(400).json({ success: false, message: 'Invalid user type' })
    }
  } catch (error) {
    console.error('Verification error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

