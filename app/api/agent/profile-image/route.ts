import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAgentSession } from '@/lib/agentAuth'
import { uploadToS3 } from '@/lib/s3'

export const runtime = 'nodejs'

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

  if (file.size > 6 * 1024 * 1024) {
    return NextResponse.json({ success: false, message: 'Image too large (max 6MB).' }, { status: 400 })
  }

  const buf = Buffer.from(await file.arrayBuffer())

  const uploaded = await uploadToS3({
    buffer: buf,
    folder: `agents/profile/${auth.agentId}`,
    filename: file.name || 'profile-image',
    contentType: mime,
  })

  await prisma.user.update({
    where: { id: auth.userId },
    data: { image: uploaded.objectUrl },
  })

  return NextResponse.json({ success: true, url: uploaded.objectUrl })
}
