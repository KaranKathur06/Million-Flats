import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgentSession } from '@/lib/agentAuth'
import { createSignedGetUrl, extractS3KeyFromUrl } from '@/lib/s3'

export const runtime = 'nodejs'

const BodySchema = z.object({
  url: z.string().trim().min(1).optional(),
  key: z.string().trim().min(1).optional(),
  expiresInSeconds: z.number().int().min(30).max(3600).optional(),
})

export async function POST(req: Request) {
  const auth = await requireAgentSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const body = await req.json().catch(() => null)
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: 'Invalid data' }, { status: 400 })
  }

  const key = parsed.data.key || (parsed.data.url ? extractS3KeyFromUrl(parsed.data.url) : null)
  if (!key) {
    return NextResponse.json({ success: false, message: 'Invalid S3 url/key' }, { status: 400 })
  }

  const signed = await createSignedGetUrl({ key, expiresInSeconds: parsed.data.expiresInSeconds })
  return NextResponse.json({ success: true, url: signed.url, expiresIn: signed.expiresIn })
}
