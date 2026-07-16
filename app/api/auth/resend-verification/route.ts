import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendEmail'
import VerificationLinkEmail from '@/lib/email/templates/verificationLinkEmail'
import { signToken } from '@/lib/auth/token'
import { getRedis, incrWithExpiry, setWithExpiry, getValue } from '@/lib/redis'

export const runtime = 'nodejs'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim().toLowerCase() : ''
}


export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = safeString(body?.email)
    const type = safeString(body?.type) || 'user'

    if (!email) return NextResponse.json({ success: false }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { email } }).catch(() => null)

    // Do not reveal whether user exists; always return success for UX.
    if (!user) return NextResponse.json({ success: true })

    const now = new Date()

    // Redis-backed rate limiting & cooldowns
    const redis = getRedis()
    const emailKey = `rl:resend:email:${email}`
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
    const ipKey = `rl:resend:ip:${ip}`
    const cooldownKey = `rl:resend:cooldown:${email}`
    const captchaKey = `rl:resend:captcha:${email}`

    // Check short cooldown (30s)
    if (redis) {
      const cooldown = await getValue(cooldownKey)
      if (cooldown) {
        return NextResponse.json({ success: true, message: 'Verification recently sent. Please wait.' })
      }

      const emailCount = await incrWithExpiry(emailKey, 60 * 60) // 1 hour window
      const ipCount = await incrWithExpiry(ipKey, 60 * 60)

      const EMAIL_LIMIT = Number(process.env.RESEND_EMAIL_LIMIT || 5)
      const CAPTCHA_THRESHOLD = Number(process.env.RESEND_EMAIL_CAPTCHA_THRESHOLD || 3)
      const IP_LIMIT = Number(process.env.RESEND_IP_LIMIT || 50)

      if (emailCount > EMAIL_LIMIT) {
        return NextResponse.json({ success: false, message: 'Too many verification requests. Try again later.' }, { status: 429 })
      }

      if (ipCount > IP_LIMIT) {
        return NextResponse.json({ success: false, message: 'Too many requests from this IP. Try later.' }, { status: 429 })
      }

      if (emailCount >= CAPTCHA_THRESHOLD) {
        await setWithExpiry(captchaKey, '1', 60 * 60)
      }

      // If captcha flag set, require a captchaResponse in the request body.
      const captchaFlag = await getValue(captchaKey).catch(() => null)
      if (captchaFlag) {
        const captchaResponse = String(body?.captchaResponse || '').trim()
        if (!captchaResponse) {
          return NextResponse.json({ success: false, requireCaptcha: true, message: 'Captcha required' }, { status: 400 })
        }

        const remoteIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || ''
        const turnstileResult = await import('@/lib/captcha/turnstile').then((m) => m.verifyTurnstileToken(captchaResponse, remoteIp))
        if (!turnstileResult.success) {
          return NextResponse.json({ success: false, requireCaptcha: true, message: 'Captcha verification failed' }, { status: 400 })
        }
      }
    } else {
      // fallback: DB short-cooldown check to avoid spam if Redis not configured
      const cooldownWindowMs = 30 * 1000 // 30s cooldown
      const recent = await prisma.emailVerificationToken.findFirst({
        where: { userId: user.id, createdAt: { gt: new Date(now.getTime() - cooldownWindowMs) } },
        orderBy: { createdAt: 'desc' },
      }).catch(() => null)

      if (recent) {
        return NextResponse.json({ success: true, message: 'Verification recently sent. Please wait.' })
      }
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = signToken(token)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: tokenHash,
        tokenType: 'link',
        expiresAt: expiresAt,
        sentAt: now,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
        userAgent: req.headers.get('user-agent') || null,
      } as any,
    }).catch(() => null)

    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL || 'https://millionflats.com'
    const link = `${base.replace(/\/$/, '')}/api/auth/verify-link?token=${encodeURIComponent(token)}`

    await sendEmail({
      to: user.email,
      subject: 'Verify your MillionFlats email',
      react: VerificationLinkEmail({ link, userName: user.name || undefined }),
    }).catch(() => null)

    // set short cooldown key in Redis
    if (getRedis()) {
      await setWithExpiry(`rl:resend:cooldown:${email}`, '1', 30)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[resend-verification] error', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
