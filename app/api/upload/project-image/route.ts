import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildProjectGalleryKey, normalizeProjectImageFilename, uploadToS3Key, buildS3ObjectUrl } from '@/lib/s3'

const ALLOWED_IMAGE_PREFIX = 'image/'

function normalizeLabelFromFilename(filename: string) {
  const dot = filename.lastIndexOf('.')
  const base = dot > 0 ? filename.slice(0, dot) : filename
  return base
    .replace(/_/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const developerSlug = String(formData.get('developerSlug') || '').trim()
    const projectSlug = String(formData.get('projectSlug') || '').trim()

    if (!file) {
      return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 })
    }
    if (!developerSlug || !projectSlug) {
      return NextResponse.json({ success: false, message: 'developerSlug and projectSlug are required' }, { status: 400 })
    }
    if (!String(file.type || '').toLowerCase().startsWith(ALLOWED_IMAGE_PREFIX)) {
      return NextResponse.json({ success: false, message: 'Only image uploads are allowed' }, { status: 400 })
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'File too large (max 50MB)' }, { status: 400 })
    }

    const normalizedFilename = normalizeProjectImageFilename({ originalName: file.name, contentType: file.type })
    const key = buildProjectGalleryKey({
      developerSlug,
      projectSlug,
      originalName: normalizedFilename,
      contentType: file.type,
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    const { key: uploadedKey } = await uploadToS3Key({
      key,
      buffer,
      contentType: file.type || 'image/jpeg',
    })

    const url = buildS3ObjectUrl({ key: uploadedKey })

    return NextResponse.json({
      success: true,
      url,
      key: uploadedKey,
      filename: normalizedFilename,
      label: normalizeLabelFromFilename(normalizedFilename),
    })
  } catch (err: any) {
    console.error('[POST /api/upload/project-image]', err)
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 })
  }
}

