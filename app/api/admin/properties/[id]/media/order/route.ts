import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

const schema = z.object({ mediaIds: z.array(z.string().min(1)).min(1).max(200) })

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const body = schema.safeParse(await req.json().catch(() => null))
  if (!body.success || new Set(body.data.mediaIds).size !== body.data.mediaIds.length) return NextResponse.json({ success: false, message: 'Invalid media order' }, { status: 400 })
  const owned = await (prisma as any).manualPropertyMedia.findMany({ where: { propertyId: params.id, id: { in: body.data.mediaIds } }, select: { id: true } })
  if (owned.length !== body.data.mediaIds.length) return NextResponse.json({ success: false, message: 'Media does not belong to this property' }, { status: 403 })
  await (prisma as any).$transaction(body.data.mediaIds.map((id, position) => (prisma as any).manualPropertyMedia.update({ where: { id }, data: { position } })))
  return NextResponse.json({ success: true })
}
