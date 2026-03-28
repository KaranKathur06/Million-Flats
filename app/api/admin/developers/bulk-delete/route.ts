import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

type BulkDeleteBody = {
  ids?: unknown
}

function parseIds(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const normalized = input
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)
  return Array.from(new Set(normalized))
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) {
    return NextResponse.json(
      { success: false, message: 'Forbidden - Insufficient role for bulk delete' },
      { status: 403 }
    )
  }

  let body: BulkDeleteBody
  try {
    body = (await req.json()) as BulkDeleteBody
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 })
  }

  const ids = parseIds(body?.ids)
  if (ids.length === 0) {
    return NextResponse.json({ success: false, message: 'No developer IDs provided' }, { status: 400 })
  }

  try {
    const existing = await (prisma as any).developer.findMany({
      where: { id: { in: ids } },
      select: { id: true, slug: true },
    })

    const existingIds = existing.map((dev: { id: string }) => dev.id)
    if (existingIds.length === 0) {
      return NextResponse.json({ success: false, message: 'No matching developers found' }, { status: 404 })
    }

    try {
      await (prisma as any).developer.updateMany({
        where: { id: { in: existingIds } },
        data: { status: 'INACTIVE', isFeatured: false, isDeleted: true, deletedAt: new Date() },
      })
    } catch {
      await (prisma as any).developer.updateMany({
        where: { id: { in: existingIds } },
        data: { status: 'INACTIVE', isFeatured: false },
      })
    }

    revalidatePath('/')
    revalidatePath('/developers')
    for (const dev of existing) {
      if (dev.slug) revalidatePath(`/developers/${dev.slug}`)
    }

    return NextResponse.json({
      success: true,
      deletedCount: existingIds.length,
      deletedIds: existingIds,
      skippedCount: ids.length - existingIds.length,
    })
  } catch (error) {
    console.error('[POST /api/admin/developers/bulk-delete] failed:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete selected developers' },
      { status: 500 }
    )
  }
}
