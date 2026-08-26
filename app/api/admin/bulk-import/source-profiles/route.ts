import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { getImportAdapterForEntity, listImportAdapters } from '@/lib/imports/registry'

const profileSchema = z.object({
  sourceKey: z.string().trim().min(1).max(120),
  entityType: z.enum(['PROPERTY', 'DEVELOPER', 'PROJECT', 'ECOSYSTEM_PARTNER', 'AGENCY', 'AGENT', 'LEAD']),
  mapping: z.record(z.unknown()),
  normalization: z.record(z.unknown()).optional().nullable(),
  relationRules: z.record(z.unknown()).optional().nullable(),
})

export async function GET(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const sourceKey = new URL(req.url).searchParams.get('sourceKey')?.trim()
  const profiles = await (prisma as any).importSourceProfile.findMany({
    where: sourceKey ? { sourceKey, isActive: true } : { isActive: true },
    orderBy: [{ sourceKey: 'asc' }, { entityType: 'asc' }, { version: 'desc' }],
    take: 500,
  })
  return NextResponse.json({ success: true, profiles, adapters: listImportAdapters() })
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
  const parsed = profileSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
  if (!getImportAdapterForEntity(parsed.data.entityType)) return NextResponse.json({ success: false, message: 'No adapter is registered for this entity.' }, { status: 422 })

  try {
    const latest = await (prisma as any).importSourceProfile.findFirst({ where: { sourceKey: parsed.data.sourceKey, entityType: parsed.data.entityType }, orderBy: { version: 'desc' }, select: { version: true } })
    const version = Number(latest?.version || 0) + 1
    await (prisma as any).importSourceProfile.updateMany({ where: { sourceKey: parsed.data.sourceKey, entityType: parsed.data.entityType, isActive: true }, data: { isActive: false } })
    const profile = await (prisma as any).importSourceProfile.create({ data: { sourceKey: parsed.data.sourceKey, entityType: parsed.data.entityType, version, mapping: parsed.data.mapping, normalization: parsed.data.normalization || null, relationRules: parsed.data.relationRules || null, isActive: true, createdByUserId: auth.userId } })
    return NextResponse.json({ success: true, profile }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Source profile creation failed.' }, { status: 409 })
  }
}