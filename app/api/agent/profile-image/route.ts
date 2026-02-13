import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { uploadToS3Key } from '@/lib/s3'

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
  const uploaded = await uploadToS3Key({
    buffer: buf,
    key: `agents/${auth.agentId}/profile.${ext}`,
    contentType: mime,
  })

  await (prisma as any).agent.update({
    where: { id: auth.agentId },
    data: { profilePhoto: uploaded.objectUrl },
  })

  return NextResponse.json({ success: true, url: uploaded.objectUrl })
}
