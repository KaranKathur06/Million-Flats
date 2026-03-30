import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    let existing: any
    try {
      existing = await (prisma as any).developer.findUnique({
        where: { id: params.id },
        select: { id: true, slug: true, isDeleted: true },
      })
    } catch {
      existing = await (prisma as any).developer.findUnique({
        where: { id: params.id },
        select: { id: true, slug: true },
      })
      if (existing) existing.isDeleted = false
    }

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Developer not found' }, { status: 404 })
    }

    if (!existing.isDeleted) {
      return NextResponse.json({ success: true, message: 'Developer is already active' })
    }

    try {
      await (prisma as any).developer.update({
        where: { id: params.id },
        data: {
          isDeleted: false,
          deletedAt: null,
          status: 'ACTIVE',
        },
      })
    } catch {
      await (prisma as any).developer.update({
        where: { id: params.id },
        data: {
          status: 'ACTIVE',
        },
      })
    }

    revalidatePath('/')
    revalidatePath('/developers')
    revalidatePath('/admin/developers')
    if (existing.slug) {
      revalidatePath(`/developers/${existing.slug}`)
    }

    return NextResponse.json({ success: true, message: 'Developer restored' })
  } catch (error: any) {
    console.error('[POST /api/admin/developers/:id/restore] failed:', error)
    return NextResponse.json(
      { success: false, message: error?.message || 'Failed to restore developer' },
      { status: 500 }
    )
  }
}
