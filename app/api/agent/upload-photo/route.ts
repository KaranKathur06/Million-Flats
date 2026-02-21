import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentProfileSession } from '@/lib/agentAuth'
import { deleteFromS3, extractS3KeyFromUrl, buildAgentProfileImageKey, uploadToS3Key } from '@/lib/s3'

export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024

type AllowedImage = {
  mime: 'image/jpeg' | 'image/png' | 'image/webp'
  ext: 'jpg' | 'png' | 'webp'
}

function asAllowedImage(mime: string): AllowedImage | null {
  const m = String(mime || '').toLowerCase()
  if (m === 'image/jpeg') return { mime: 'image/jpeg', ext: 'jpg' }
  if (m === 'image/png') return { mime: 'image/png', ext: 'png' }
  if (m === 'image/webp') return { mime: 'image/webp', ext: 'webp' }
  return null
}

export async function POST(req: Request) {
  try {
    const auth = await requireAgentProfileSession()
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const role = String(auth.role || '').toUpperCase()
    if (role !== 'AGENT') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const form = await req.formData()
    const file = form.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'Missing file' }, { status: 400 })
    }

    const allowed = asAllowedImage(file.type)
    if (!allowed) {
      return NextResponse.json({ success: false, message: 'Only JPG/PNG/WebP images are allowed.' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ success: false, message: 'Image too large (max 5MB).' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())

    const previous = await (prisma as any).agent
      .findUnique({ where: { id: auth.agentId }, select: { profileImageKey: true, profileImageUrl: true, profilePhoto: true } })
      .catch(() => null)

    const ts = Date.now()
    const key = buildAgentProfileImageKey({ agentId: auth.agentId, ext: allowed.ext, timestamp: ts })

    const uploaded = await uploadToS3Key({
      buffer: buf,
      key,
      contentType: allowed.mime,
    })

    const updatedAt = new Date(ts)

    const updated = await (prisma as any).agent.update({
      where: { id: auth.agentId },
      data: {
        profilePhoto: uploaded.objectUrl,
        profileImageUrl: uploaded.objectUrl,
        profileImageKey: uploaded.key,
        profileImageUpdatedAt: updatedAt,
      } as any,
      select: { id: true, profilePhoto: true, profileImageUrl: true, profileImageKey: true, profileImageUpdatedAt: true },
    })

    const prevKey =
      (previous && typeof previous.profileImageKey === 'string' && previous.profileImageKey.trim()
        ? String(previous.profileImageKey)
        : previous && typeof previous.profileImageUrl === 'string' && previous.profileImageUrl.trim()
          ? extractS3KeyFromUrl(String(previous.profileImageUrl))
          : previous && typeof previous.profilePhoto === 'string' && previous.profilePhoto.trim()
            ? extractS3KeyFromUrl(String(previous.profilePhoto))
            : null) || null

    if (prevKey && prevKey !== uploaded.key) {
      await deleteFromS3(prevKey).catch(() => null)
    }

    return NextResponse.json({ success: true, agent: updated }, { status: 200 })
  } catch (error) {
    console.error('Agent upload photo: failed', error)
    return NextResponse.json({ success: false, message: 'Failed to upload image' }, { status: 500 })
  }
}
