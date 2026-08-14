import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildProjectMediaTypeKey, normalizeProjectImageFilename, uploadToS3Key } from '@/lib/s3'
import { buildAssetUrl } from '@/lib/assetUrl'
import { PROJECT_FLOOR_PLAN_ALLOWED_TYPES, PROJECT_FLOOR_PLAN_MAX_SIZE } from '@/components/admin/projects/ProjectForm/ProjectFormSchema'

export const runtime = 'nodejs'

// Server-side image upload size limits (configurable via env)
const IMAGE_MAX_SIZE = Number(process.env.PROJECT_IMAGE_MAX_SIZE_BYTES) || 50 * 1024 * 1024 // 50MB default
const FLOOR_PLAN_MAX_SIZE = PROJECT_FLOOR_PLAN_MAX_SIZE // 5MB from client schema

const ALLOWED_IMAGE_PREFIX = 'image/'
const ALLOWED_PDF_TYPE = 'application/pdf'

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
    const mediaType = String(formData.get('mediaType') || formData.get('category') || 'hero').trim().toLowerCase()

    if (!file) {
      return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 })
    }
    if (!developerSlug || !projectSlug) {
      return NextResponse.json({ success: false, message: 'developerSlug and projectSlug are required' }, { status: 400 })
    }
    const normalizedType = String(file.type || '').toLowerCase()
    const isImage = normalizedType.startsWith(ALLOWED_IMAGE_PREFIX)
    const isPdfFloorPlan = mediaType === 'floor_plan' && normalizedType === ALLOWED_PDF_TYPE
    if (!isImage && !isPdfFloorPlan) {
      return NextResponse.json({ success: false, message: 'Only image uploads or floor-plan PDFs are allowed' }, { status: 400 })
    }
    if (mediaType === 'floor_plan' && !PROJECT_FLOOR_PLAN_ALLOWED_TYPES.includes(normalizedType)) {
      return NextResponse.json({ success: false, message: 'Unsupported floor-plan file type' }, { status: 400 })
    }
    
    const maxSizeForType = mediaType === 'floor_plan' ? FLOOR_PLAN_MAX_SIZE : IMAGE_MAX_SIZE
    if (file.size > maxSizeForType) {
      const maxMB = Math.floor(maxSizeForType / 1024 / 1024)
      const errorMsg = mediaType === 'floor_plan' 
        ? `Floor-plan file too large (max ${maxMB}MB)` 
        : `File too large (max ${maxMB}MB)`
      return NextResponse.json({ success: false, message: errorMsg }, { status: 413 })
    }

    const normalizedFilename = normalizeProjectImageFilename({ originalName: file.name, contentType: file.type })
    const key = buildProjectMediaTypeKey({
      developerSlug,
      projectSlug,
      originalName: normalizedFilename,
      contentType: file.type,
      mediaType,
    })

    const buffer = Buffer.from(await file.arrayBuffer())
    const { key: uploadedKey } = await uploadToS3Key({
      key,
      buffer,
      contentType: file.type || 'image/jpeg',
    })

    const url = buildAssetUrl(uploadedKey) || uploadedKey

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


