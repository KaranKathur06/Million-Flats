import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

const bulkDeveloperSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  slug: z.string().max(200).optional(),
  logo: z.string().max(2000).optional().nullable(),
  banner: z.string().max(2000).optional().nullable(),
  country: z.string().optional().nullable(),
  countryIso2: z.string().max(2).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  description: z.string().optional().nullable(),
  short_description: z.string().max(500).optional().nullable(),
  website: z.string().optional().nullable(),
  founded_year: z.number().int().min(1800).max(2100).optional().nullable(),
  is_featured: z.boolean().optional(),
  featured_rank: z.number().int().min(0).optional().nullable(),
  status: z.string().optional(),
  specialization: z.any().optional(), // Accept but normalize
})

const bulkPayloadSchema = z.object({
  developers: z.array(bulkDeveloperSchema).min(1, 'At least one developer is required').max(200, 'Maximum 200 developers per batch'),
  mode: z.enum(['skip', 'update']).optional(),
  restoreDeleted: z.boolean().optional(),
})

type BulkStatus = 'created' | 'updated' | 'restored' | 'skipped' | 'error'

type BulkResult = {
  name: string
  status: BulkStatus
  slug?: string
  reason?: string
}

function normalizeCountry(country: string | null | undefined) {
  const countryStr = (country || '').trim().toUpperCase()
  const countryCode = countryStr === 'INDIA' || countryStr === 'IN' ? 'INDIA' : 'UAE'
  const countryIso2 = countryCode === 'INDIA' ? 'IN' : 'AE'
  return { countryCode, countryIso2 }
}

async function uniqueSlug(base: string, currentId?: string) {
  const raw = base.trim() || 'developer'
  let candidate = raw
  let counter = 1

  while (true) {
    const conflict = await (prisma as any).developer.findFirst({
      where: currentId
        ? { slug: candidate, NOT: { id: currentId } }
        : { slug: candidate },
      select: { id: true },
    })
    if (!conflict) return candidate
    candidate = `${raw}-${counter++}`
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const parsed = bulkPayloadSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          errors: parsed.error.flatten().fieldErrors,
          details: parsed.error.issues.map(i => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      )
    }

    const devs = parsed.data.developers
    const mode = parsed.data.mode || 'skip'
    const restoreDeleted = parsed.data.restoreDeleted !== false
    const results: BulkResult[] = []

    // Fetch existing records once for deterministic per-row strategy.
    let existingDevs: any[]
    try {
      existingDevs = await (prisma as any).developer.findMany({
        select: { id: true, name: true, slug: true, isDeleted: true },
      })
    } catch {
      existingDevs = await (prisma as any).developer.findMany({
        select: { id: true, name: true, slug: true },
      })
      existingDevs = existingDevs.map((dev: any) => ({ ...dev, isDeleted: false }))
    }

    const byName = new Map<string, any>()
    const bySlug = new Map<string, any>()
    for (const dev of existingDevs as any[]) {
      const nameKey = String(dev?.name || '').trim().toLowerCase()
      const slugKey = String(dev?.slug || '').trim().toLowerCase()
      if (nameKey && !byName.has(nameKey)) byName.set(nameKey, dev)
      if (slugKey && !bySlug.has(slugKey)) bySlug.set(slugKey, dev)
    }

    for (const dev of devs) {
      try {
        const rawName = dev.name.trim()
        const nameKey = rawName.toLowerCase()
        const requestedSlug = (dev.slug?.trim() || '').toLowerCase()
        const existing = byName.get(nameKey) || (requestedSlug ? bySlug.get(requestedSlug) : null)

        const normalizedStatus = (dev.status || 'ACTIVE').toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE'
        const { countryCode, countryIso2: fallbackIso2 } = normalizeCountry(dev.country)

        const payload: any = {
          name: rawName,
          logo: dev.logo || null,
          banner: dev.banner || null,
          countryCode,
          countryIso2: dev.countryIso2 || fallbackIso2,
          city: dev.city?.trim() || null,
          description: dev.description?.trim() || null,
          shortDescription: dev.short_description?.trim() || null,
          website: dev.website?.trim() || null,
          foundedYear: dev.founded_year || null,
          isFeatured: dev.is_featured ?? false,
          featuredRank: dev.featured_rank ?? null,
          status: normalizedStatus,
        }

        if (existing) {
          if (existing.isDeleted) {
            if (!restoreDeleted) {
              results.push({
                name: rawName,
                status: 'skipped',
                slug: existing.slug || undefined,
                reason: 'Developer exists in deleted state; restoreDeleted is disabled',
              })
              continue
            }

            const restoredSlug = await uniqueSlug(dev.slug?.trim() || existing.slug || slugify(rawName), existing.id)
            const restored = await (prisma as any).developer.update({
              where: { id: existing.id },
              data: {
                ...payload,
                slug: restoredSlug,
                isDeleted: false,
                deletedAt: null,
              },
              select: { id: true, name: true, slug: true, isDeleted: true },
            })

            byName.set(nameKey, restored)
            if (restored.slug) bySlug.set(String(restored.slug).toLowerCase(), restored)

            results.push({ name: rawName, status: 'restored', slug: restored.slug || undefined })
            continue
          }

          if (mode === 'update') {
            const updatedSlug = await uniqueSlug(dev.slug?.trim() || existing.slug || slugify(rawName), existing.id)
            const updated = await (prisma as any).developer.update({
              where: { id: existing.id },
              data: { ...payload, slug: updatedSlug },
              select: { id: true, name: true, slug: true, isDeleted: true },
            })

            byName.set(nameKey, updated)
            if (updated.slug) bySlug.set(String(updated.slug).toLowerCase(), updated)

            results.push({ name: rawName, status: 'updated', slug: updated.slug || undefined })
            continue
          }

          results.push({
            name: rawName,
            status: 'skipped',
            slug: existing.slug || undefined,
            reason: 'Developer already exists',
          })
          continue
        }

        const createSlug = await uniqueSlug(dev.slug?.trim() || slugify(rawName))
        const created = await (prisma as any).developer.create({
          data: {
            ...payload,
            slug: createSlug,
            isDeleted: false,
            deletedAt: null,
          },
          select: { id: true, name: true, slug: true, isDeleted: true },
        })

        byName.set(nameKey, created)
        if (created.slug) bySlug.set(String(created.slug).toLowerCase(), created)

        results.push({ name: rawName, status: 'created', slug: created.slug || undefined })
      } catch (err: any) {
        results.push({ name: dev.name, status: 'error', reason: err.message || 'Unknown error' })
      }
    }

    const created = results.filter(r => r.status === 'created').length
    const updated = results.filter(r => r.status === 'updated').length
    const restored = results.filter(r => r.status === 'restored').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const errors = results.filter(r => r.status === 'error').length

    revalidatePath('/')
    revalidatePath('/developers')
    revalidatePath('/admin/developers')

    return NextResponse.json({
      success: true,
      message: `Processed ${devs.length} developers: ${created} created, ${updated} updated, ${restored} restored, ${skipped} skipped, ${errors} errors`,
      summary: { total: devs.length, created, updated, restored, skipped, errors },
      results,
      mode,
      restoreDeleted,
    })
  } catch (err: any) {
    console.error('[POST /api/admin/developers/bulk]', err)
    return NextResponse.json({ success: false, message: err.message || 'Internal error' }, { status: 500 })
  }
}
