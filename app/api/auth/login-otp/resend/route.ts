import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendEmail'
import OTPEmail from '@/lib/email/templates/otpEmail'

export const runtime = 'nodejs'

type RateEntry = { count: number; resetAt: number }

const ipRate = new Map<string, RateEntry>()
// We allow broader email limits here because the 30s cooldown is enforced strictly via DB.
const emailRate = new Map<string, RateEntry>()

function getClientIp(req: Request) {
    const xf = req.headers.get('x-forwarded-for')
    if (xf) return xf.split(',')[0]?.trim() || 'unknown'
    return 'unknown'
}

function allow(rate: Map<string, RateEntry>, key: string, max: number, windowMs: number) {
    const now = Date.now()
    const cur = rate.get(key)
    if (!cur || cur.resetAt <= now) {
        rate.set(key, { count: 1, resetAt: now + windowMs })
        return true
    }
    if (cur.count >= max) return false
    cur.count += 1
    return true
}

function safeString(v: unknown) {
    return typeof v === 'string' ? v.trim() : ''
}

function normalizeRole(v: unknown) {
    const s = safeString(v).toUpperCase()
    if (s === 'AGENT' || s === 'USER') return s
    return 'USER'
}

function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

function hashOtp(code: string) {
    return crypto.createHash('sha256').update(code).digest('hex')
}

export async function POST(req: Request) {
    const ip = getClientIp(req)
    const windowMs = 15 * 60 * 1000

    // 1. IP Rate Limiting
    if (!allow(ipRate, ip, 30, windowMs)) {
        return NextResponse.json({ success: false, code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' }, { status: 429 })
    }

    const body = await req.json().catch(() => null)
    const email = safeString(body?.email).toLowerCase()
    const role = normalizeRole(body?.role)

    if (!email) {
        return NextResponse.json({ success: false, code: 'MISSING_FIELDS', message: 'Email is required.' }, { status: 400 })
    }

    // 2. Email Rate Limiting (Secondary)
    if (!allow(emailRate, email, 10, windowMs)) {
        return NextResponse.json({ success: false, code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' }, { status: 429 })
    }

    // 3. Check Account Exists
    const user = await prisma.user.findUnique({ where: { email } }).catch(() => null)
    if (!user) {
        // Return a generic success to prevent email enumeration, but do nothing.
        return NextResponse.json({ success: true, message: 'If an account exists, a new OTP has been sent.' }, { status: 200 })
    }

    // Ensure they are requesting correct role logic
    if (role === 'AGENT') {
        const isAgent = String((user as any).role).toUpperCase() === 'AGENT' || Boolean((user as any).agent)
        if (!isAgent) {
            return NextResponse.json({ success: false, code: 'AGENT_NOT_REGISTERED', message: 'Account is not an agent.' }, { status: 403 })
        }
    }

    // 4. Enforce 30-Second Cooldown Check
    const now = Date.now()
    const thirtySecondsAgo = new Date(now - 30 * 1000)

    const lastOtp = await (prisma as any).loginOtp
        .findFirst({
            where: {
                email,
                role,
            },
            orderBy: { createdAt: 'desc' },
        })
        .catch(() => null)

    if (lastOtp && lastOtp.createdAt > thirtySecondsAgo) {
        const remainingMs = lastOtp.createdAt.getTime() + 30000 - now
        const remainingSecs = Math.ceil(remainingMs / 1000)
        return NextResponse.json({
            success: false,
            code: 'COOLDOWN_ACTIVE',
            message: `Please wait ${remainingSecs} seconds before requesting a new OTP.`
        }, { status: 429 })
    }

    // 5. Invalidate Previous active OTPs for this role
    await (prisma as any).loginOtp.updateMany({
        where: {
            email,
            role,
            consumed: false,
            usedAt: null
        },
        data: {
            consumed: true
        },
    }).catch(() => null)

    // 6. Generate and Store New OTP
    const otp = generateOtp()
    const expiresAt = new Date(now + 10 * 60 * 1000) // 10 minutes
    const codeHash = hashOtp(otp)

    await (prisma as any).loginOtp.create({
        data: {
            id: crypto.randomUUID(),
            email,
            role,
            codeHash,
            attempts: 0,
            expiresAt,
            consumed: false,
            ipAddress: ip,
        },
    }).catch(() => null)

    // 7. Send Email seamlessly with Resend + React Email via Gateway
    await sendEmail({
        to: email,
        subject: 'Your MillionFlats verification code',
        react: OTPEmail({ otp }),
    }).catch(() => null)

    return NextResponse.json({
        success: true,
        message: 'A new OTP has been sent to your email.'
    }, { status: 200 })
}
