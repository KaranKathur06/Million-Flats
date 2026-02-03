import type { NextApiRequest, NextApiResponse } from 'next'
import { z } from 'zod'
import { getServerSession } from 'next-auth/next'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 5
const rateLimitBuckets = new Map<string, number[]>()

function getClientIp(req: NextApiRequest) {
  const xff = req.headers['x-forwarded-for']
  const first = Array.isArray(xff) ? xff[0] : xff
  if (first) return String(first).split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function isRateLimited(key: string) {
  const now = Date.now()
  const existing = rateLimitBuckets.get(key) || []
  const fresh = existing.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  fresh.push(now)
  rateLimitBuckets.set(key, fresh)
  return fresh.length > RATE_LIMIT_MAX
}

const ContactSubmissionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  subject: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(5000),
})

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  const ip = getClientIp(req)
  if (isRateLimited(`contact:${ip}`)) {
    return res.status(429).json({ success: false, message: 'Too many requests. Please try again in a minute.' })
  }

  return void (async () => {
    try {
      const parsed = ContactSubmissionSchema.safeParse(req.body)
      if (!parsed.success) {
        return res.status(400).json({ success: false, message: 'Invalid form data' })
      }

      const { name, email, phone, subject, message } = parsed.data

      if (String(subject).toLowerCase() === 'agent_inquiry') {
        const session = await getServerSession(req, res, authOptions)
        if (!session?.user) {
          return res.status(401).json({ success: false, message: 'Please login to contact an agent.' })
        }
      }

      await prisma.contactSubmission.create({
        data: {
          name,
          email: email.toLowerCase(),
          phone: phone ? String(phone).trim() : null,
          message: `[${subject}] ${message}`,
        },
      })

      return res.status(200).json({
        success: true,
        message: 'Thank you for your message. We will get back to you soon.',
      })
    } catch (error) {
      console.error('Contact form error:', error)
      return res.status(500).json({ success: false, message: 'Internal server error' })
    }
  })()
}

