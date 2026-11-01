import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthenticatedEcosystemUser } from '@/lib/ecosystem/auth'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'

const SlugSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
const CategoryFields = {
  slug: SlugSchema,
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000),
  heroImage: z.string().trim().max(1000),
  metaTitle: z.string().trim().max(160),
  metaDescription: z.string().trim().max(320),
  priorityOrder: z.number().int().min(0).max(10000),
  isActive: z.boolean(),
}

const CreateSchema = z.object(CategoryFields)
const UpdateSchema = z.object({
  id: z.string().min(1),
  ...Object.fromEntries(
    Object.entries(CategoryFields).map(([field, schema]) => [field, schema.optional()])
  ),
}).refine((value) => Object.keys(value).some((key) => key !== 'id'), 'At least one category field is required.')

function isUniqueError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'P2002')
}

export async function GET() {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  try {
    const categories = await (prisma as any).ecosystemCategory.findMany({
      orderBy: [{ priorityOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true, slug: true, title: true, description: true, heroImage: true,
        metaTitle: true, metaDescription: true, priorityOrder: true, isActive: true,
      },
    })
    return NextResponse.json({ success: true, data: categories }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('[admin-ecosystem-categories] Failed to load categories', error)
    return NextResponse.json({ success: false, message: 'Unable to load ecosystem categories.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const parsed = CreateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Check the category details and try again.' }, { status: 400 })
  const actor = await getAuthenticatedEcosystemUser()
  try {
    const category = await (prisma as any).$transaction(async (tx: any) => {
      const created = await tx.ecosystemCategory.create({ data: parsed.data })
      await tx.auditLog.create({
        data: {
          entityType: 'ECOSYSTEM_CATEGORY',
          entityId: created.id,
          action: 'ADMIN_ECOSYSTEM_CATEGORY_UPDATED',
          performedByUserId: actor?.id || null,
          beforeState: null,
          afterState: created,
        },
      })
      return created
    })
    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    if (isUniqueError(error)) return NextResponse.json({ success: false, message: 'A category with this slug already exists.' }, { status: 409 })
    console.error('[admin-ecosystem-categories] Failed to create category', error)
    return NextResponse.json({ success: false, message: 'Unable to create ecosystem category.' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Check the category details and try again.' }, { status: 400 })
  const { id, ...changes } = parsed.data
  const actor = await getAuthenticatedEcosystemUser()
  try {
    const category = await (prisma as any).$transaction(async (tx: any) => {
      const before = await tx.ecosystemCategory.findUnique({ where: { id } })
      if (!before) return null
      const updated = await tx.ecosystemCategory.update({ where: { id }, data: changes })
      await tx.auditLog.create({
        data: {
          entityType: 'ECOSYSTEM_CATEGORY',
          entityId: id,
          action: 'ADMIN_ECOSYSTEM_CATEGORY_UPDATED',
          performedByUserId: actor?.id || null,
          beforeState: before,
          afterState: updated,
        },
      })
      return updated
    })
    if (!category) return NextResponse.json({ success: false, message: 'Category not found.' }, { status: 404 })
    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    if (isUniqueError(error)) return NextResponse.json({ success: false, message: 'A category with this slug already exists.' }, { status: 409 })
    console.error('[admin-ecosystem-categories] Failed to update category', error)
    return NextResponse.json({ success: false, message: 'Unable to update ecosystem category.' }, { status: 500 })
  }
}
