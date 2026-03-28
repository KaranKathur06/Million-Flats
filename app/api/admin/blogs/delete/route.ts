import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

type DeleteBody = {
  ids?: unknown
}

function parseIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const normalized = input
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

/** Roles permitted to bulk-delete blogs */
const BULK_DELETE_ROLES = ['ADMIN', 'SUPERADMIN']

export async function DELETE(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  // Cast to string for safe comparison — avoids TS overlap lint with AppRole
  const role = String(auth.role)

  if (!BULK_DELETE_ROLES.includes(role)) {
    return NextResponse.json(
      { success: false, message: 'Forbidden - Only admins can bulk-delete blogs' },
      { status: 403 }
    )
  }

  let body: DeleteBody
  try {
    body = (await req.json()) as DeleteBody
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 })
  }

  const ids = parseIds(body?.ids)
  if (ids.length === 0) {
    return NextResponse.json({ success: false, message: 'No blog IDs provided' }, { status: 400 })
  }

  try {
    const existing = await (prisma as any).blog.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    })

    const existingIds = existing.map((blog: { id: string }) => blog.id)
    if (existingIds.length === 0) {
      return NextResponse.json({ success: false, message: 'No matching blogs found' }, { status: 404 })
    }

    const result = await (prisma as any).blog.deleteMany({
      where: { id: { in: existingIds } },
    })

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      deletedIds: existingIds,
      skippedCount: ids.length - existingIds.length,
    })
  } catch (error) {
    console.error('Bulk delete blogs error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete selected blogs' },
      { status: 500 }
    )
  }
}
