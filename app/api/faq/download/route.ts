import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createLeadMagnetDownload, getFaqLeadMagnetSlug } from '@/lib/leadMagnets/server'
import { checkLeadMagnetRateLimit } from '@/lib/leadMagnets/rateLimit'

export const dynamic = 'force-dynamic'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = safeString((session?.user as any)?.id)
    const email = safeString((session?.user as any)?.email).toLowerCase()

    if (!userId) {
      return NextResponse.json({ success: false, message: 'Unauthorized', loginRequired: true }, { status: 401 })
    }

    const limiter = checkLeadMagnetRateLimit(`user:${userId}`)
    if (!limiter.ok) {
      return NextResponse.json(
        { success: false, message: 'Too many download attempts. Try again shortly.' },
        { status: 429, headers: { 'Retry-After': String(limiter.retryAfterSec) } }
      )
    }

    const url = new URL(req.url)
    const ipAddress = safeString(req.headers.get('x-forwarded-for')).split(',')[0]?.trim() || safeString(req.headers.get('x-real-ip')) || null
    const userAgent = safeString(req.headers.get('user-agent')) || null

    const result = await createLeadMagnetDownload({
      slug: getFaqLeadMagnetSlug(),
      userId,
      email: email || null,
      source: 'faq_popup',
      path: '/api/faq/download',
      ipAddress,
      userAgent,
    })

    if (!result.ok) {
      return NextResponse.json({ success: false, message: result.message }, { status: result.status })
    }

    return NextResponse.json(
      {
        success: true,
        download_url: result.downloadUrl,
        expires_in: result.expiresIn,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[GET /api/faq/download] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to generate download URL' }, { status: 500 })
  }
}
