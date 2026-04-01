import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { uploadFile, UploadServiceError } from '@/services/uploadService'

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

    const uploaded = await uploadFile({
      file,
      visibility: 'private',
      module: 'lead-magnets',
      subModule: 'faq',
      entityId: slug,
      allowedMimeTypes: ['application/pdf'],
      maxSizeBytes: 10 * 1024 * 1024,
    })

    return NextResponse.json({ success: true, key: uploaded.key, file_url: uploaded.url })
  } catch (error) {
    if (error instanceof UploadServiceError) {
      return NextResponse.json({ success: false, message: error.message }, { status: error.status })
    }
    console.error('[POST /api/admin/lead-magnets/upload] failed:', error)
    return NextResponse.json({ success: false, message: 'Upload failed' }, { status: 500 })
  }
}

