import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { deleteFromS3, extractS3KeyFromUrl } from '@/lib/s3'

export const runtime = 'nodejs'

const BodySchema = z.object({
  url: z.string().trim().url(),
})

function isBlogPublicKey(key: string) {
  return key.startsWith('public/blogs/')
}

export async function DELETE(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 })
    }

    const key = extractS3KeyFromUrl(parsed.data.url)
    if (!key || !isBlogPublicKey(key)) {
      return NextResponse.json({ success: false, message: 'Invalid blog image URL' }, { status: 400 })
    }

    await deleteFromS3(key)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/blogs/upload/delete] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to delete image' }, { status: 500 })
  }
}
