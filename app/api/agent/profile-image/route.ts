import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { buildAgentProfileImageKey, deleteFromS3, extractS3KeyFromUrl, uploadToS3Key } from '@/lib/s3'

export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024

function isAllowedImageType(mime: string) {
  return mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp'
}

export async function POST(req: Request) {
  const auth = await requireAgentSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const form = await req.formData()
  const file = form.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ success: false, message: 'Missing file' }, { status: 400 })
  }

  const mime = file.type || ''
  if (!isAllowedImageType(mime)) {
    return NextResponse.json({ success: false, message: 'Only JPG/PNG/WebP images are allowed.' }, { status: 400 })
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ success: false, message: 'Image too large (max 5MB).' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'

  const previous = await (prisma as any).agent
    .findUnique({ where: { id: auth.agentId }, select: { profileImageKey: true, profileImageUrl: true, profilePhoto: true } })
    .catch(() => null)

  const ts = Date.now()
  const key = buildAgentProfileImageKey({ agentId: auth.agentId, ext, timestamp: ts })

  const uploaded = await uploadToS3Key({
    buffer: buf,
    key,
    contentType: mime,
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

  return NextResponse.json({ success: true, agent: updated })
}
