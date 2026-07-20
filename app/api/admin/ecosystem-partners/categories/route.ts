import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const categories = await (prisma as any).ecosystemCategory.findMany({
    where: { isActive: true },
    orderBy: { priorityOrder: 'asc' },
    select: { id: true, slug: true, title: true, heroImage: true },
  })

  return NextResponse.json({ success: true, data: categories })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const body = await request.json().catch(() => null)
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  const heroImage = typeof body?.heroImage === 'string' ? body.heroImage.trim() : ''

  if (!id) {
    return NextResponse.json({ success: false, message: 'Category ID is required' }, { status: 400 })
  }

  const category = await (prisma as any).ecosystemCategory.update({
    where: { id },
    data: { heroImage },
    select: { id: true, slug: true, title: true, heroImage: true },
  })

  revalidatePath(`/ecosystem-partners/${category.slug}`)
  revalidatePath('/ecosystem-partners')

  return NextResponse.json({ success: true, data: category })
}
