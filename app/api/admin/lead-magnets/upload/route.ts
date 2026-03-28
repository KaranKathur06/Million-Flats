import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { buildCanonicalKey, sanitizeFilename, uploadToS3Key } from '@/lib/s3'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function forbidden(message = 'Forbidden', status = 403) {
  return NextResponse.json({ success: false, message }, { status })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) return forbidden('Unauthorized', 401)
  if (!hasMinRole(role, 'ADMIN')) return forbidden()

  try {
    const formData = await req.formData()
    const file = formData.get('file')
    const slug = String(formData.get('slug') || '').trim().toLowerCase() || 'lead-magnet'

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: 'File is required' }, { status: 400 })
    }

    if (!String(file.type || '').toLowerCase().includes('pdf')) {
      return NextResponse.json({ success: false, message: 'Only PDF files are allowed' }, { status: 400 })
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'PDF is too large (max 25MB)' }, { status: 400 })
    }

    const extName = String(file.name || 'guide.pdf').toLowerCase().endsWith('.pdf')
      ? file.name
      : `${file.name || 'guide'}.pdf`

    const key = buildCanonicalKey({
      visibility: 'private',
      folder: `lead-magnets/${sanitizeFilename(slug)}`,
      filename: sanitizeFilename(extName),
      includeTimestamp: true,
    })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await uploadToS3Key({ buffer, key, contentType: 'application/pdf' })

    return NextResponse.json({ success: true, key })
  } catch (error) {
    console.error('[POST /api/admin/lead-magnets/upload] failed:', error)
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 })
  }
}
