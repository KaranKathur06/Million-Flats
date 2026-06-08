import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

type BulkRestoreBody = {
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

  let body: BulkRestoreBody
  try {
    body = (await req.json()) as BulkRestoreBody
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 })
  }

  const ids = parseIds(body?.ids)
  if (ids.length === 0) {
    return NextResponse.json({ success: false, message: 'No developer IDs provided' }, { status: 400 })
  }

  try {
    let existing: any[]
    try {
      existing = await (prisma as any).developer.findMany({
        where: { id: { in: ids } },
        select: { id: true, slug: true, isDeleted: true },
      })
    } catch {
      existing = await (prisma as any).developer.findMany({
        where: { id: { in: ids } },
        select: { id: true, slug: true },
      })
      existing = existing.map((dev) => ({ ...dev, isDeleted: false }))
    }

    const restoreIds = existing
      .filter((dev: { isDeleted?: boolean }) => !!dev.isDeleted)
      .map((dev: { id: string }) => dev.id)

    if (restoreIds.length === 0) {
      return NextResponse.json({
        success: true,
        restoredCount: 0,
        restoredIds: [],
        skippedCount: ids.length,
      })
    }

    try {
      await (prisma as any).developer.updateMany({
        where: { id: { in: restoreIds } },
        data: { isDeleted: false, deletedAt: null, status: 'ACTIVE' },
      })
    } catch {
      await (prisma as any).developer.updateMany({
        where: { id: { in: restoreIds } },
        data: { status: 'ACTIVE' },
      })
    }

    revalidatePath('/')
    revalidatePath('/developers')
    revalidatePath('/admin/developers')
    for (const dev of existing) {
      if (dev.slug) revalidatePath(`/developers/${dev.slug}`)
    }

    return NextResponse.json({
      success: true,
      restoredCount: restoreIds.length,
      restoredIds: restoreIds,
      skippedCount: ids.length - restoreIds.length,
    })
  } catch (error) {
    console.error('[POST /api/admin/developers/bulk-restore] failed:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to restore selected developers' },
      { status: 500 }
    )
  }
}
