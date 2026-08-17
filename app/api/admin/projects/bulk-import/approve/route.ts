import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { buildCanonicalProjectCreatePayload, buildProjectImportPreview } from '@/lib/projectImportV2'
import { parseAEDInput } from '@/lib/pricing'
import { z } from 'zod'

const approveBulkImportSchema = z.object({
  schemaVersion: z.string().optional(),
  importType: z.enum(['PROJECTS']).optional(),
  source: z.object({
    provider: z.string().optional(),
    sourceUrl: z.string().max(2000).optional().nullable(),
    scrapedAt: z.string().optional().nullable(),
  }).optional(),
  projects: z.array(z.any()).min(1).max(200),
  approvedBy: z.string().max(200).optional().nullable(),
  reviewNote: z.string().max(5000).optional().nullable(),
})

function slugify(text: string) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)
}

async function resolveDeveloper(slug: string, name: string) {
  const normalizedSlug = slugify(slug || name)
  let developer = await prisma.developer.findUnique({ where: { slug: normalizedSlug } })
  if (!developer) {
    developer = await prisma.developer.findFirst({ where: { name } })
  }
  if (!developer && normalizedSlug) {
    developer = await prisma.developer.create({
      data: {
        name,
        slug: normalizedSlug,
        countryCode: 'UAE',
        countryIso2: 'AE',
      },
    })
  }
  return developer
}

export async function POST(req: Request) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const parsed = approveBulkImportSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const preview = buildProjectImportPreview(parsed.data)
    if (!preview.ok) {
      return NextResponse.json({ success: false, message: 'Import contains blocking issues and cannot be approved.', preview, requiresReview: true }, { status: 400 })
    }

    const approvedProjects = buildCanonicalProjectCreatePayload(parsed.data)
    const results: Array<{ name: string; slug: string; status: 'created' | 'skipped' | 'error'; reason?: string }> = []

    for (const item of approvedProjects) {
      try {
        const developerInput = item.developer || { slug: 'unknown', name: 'Unknown Developer' }
        const developerName = String(developerInput.name || developerInput.slug || 'Unknown Developer').trim()
        const developerSlug = slugify(String(developerInput.slug || developerName || 'unknown-developer'))

        const developer = await resolveDeveloper(developerSlug, developerName)
        if (!developer) {
          results.push({ name: item.name, slug: item.slug, status: 'error', reason: 'Developer could not be created or resolved' })
          continue
        }

        const candidateSlug = item.slug || slugify(item.name)
        const existing = await prisma.project.findUnique({ where: { slug: candidateSlug } })
        if (existing) {
          results.push({ name: item.name, slug: candidateSlug, status: 'skipped', reason: 'Slug already exists' })
          continue
        }

        const project = await prisma.project.create({
          data: {
            name: item.name,
            slug: candidateSlug,
            developerId: developer.id,
            countryIso2: item.countryIso2 || 'IN',
            city: item.city || null,
            community: item.community || null,
            description: item.description || null,
            overview: item.overview || null,
            completionYear: item.completionYear ?? null,
            startingPrice: item.startingPrice ?? null,
            goldenVisa: Boolean(item.goldenVisa),
            isFeatured: Boolean(item.isFeatured),
            featuredOrder: item.isFeatured ? (item.featuredOrder ?? 0) : null,
            coverImage: item.coverImage || null,
            status: 'DRAFT',
          },
          select: { id: true, slug: true, name: true },
        })

        if (Array.isArray(item.paymentPlans) && item.paymentPlans.length > 0) {
          await prisma.projectPaymentPlan.createMany({
            data: item.paymentPlans.map((plan: any, idx: number) => ({
              projectId: project.id,
              itemType: plan.itemType === 'FEE' ? 'FEE' : 'BASE_PRICE',
              label: String(plan.label || 'Installment').trim(),
              amount: parseAEDInput(plan.amount) ?? Number(plan.amount ?? 0),
              currency: String(plan.currency || 'AED').trim().toUpperCase() || 'AED',
              milestone: plan.milestone || null,
              sortOrder: idx,
            })),
          })
        }

        if (Array.isArray(item.amenities) && item.amenities.length > 0) {
          await prisma.projectAmenity.createMany({
            data: item.amenities.map((amenity: any) => ({
              projectId: project.id,
              name: String(amenity.name || '').trim(),
              icon: amenity.icon || null,
              category: amenity.category || null,
            })).filter((amenity: any) => amenity.name),
          })
        }

        if (Array.isArray(item.nearbyPlaces) && item.nearbyPlaces.length > 0) {
          await prisma.projectNearbyPlace.createMany({
            data: item.nearbyPlaces.map((place: any, idx: number) => ({
              projectId: project.id,
              name: String(place.name || '').trim(),
              category: place.category || null,
              distance: place.distance || null,
              sortOrder: idx,
            })).filter((place: any) => place.name),
          })
        }

        if (item.location) {
          await prisma.projectLocation.create({
            data: {
              projectId: project.id,
              latitude: item.location.latitude ?? null,
              longitude: item.location.longitude ?? null,
              address: item.location.address || null,
              mapUrl: item.location.mapUrl || null,
            },
          })
        }

        if (Array.isArray(item.videos) && item.videos.length > 0) {
          await prisma.projectVideo.createMany({
            data: item.videos.map((video: any, idx: number) => ({
              projectId: project.id,
              videoUrl: String(video.videoUrl || '').trim(),
              title: video.title || null,
              thumbnail: video.thumbnail || null,
              sortOrder: idx,
            })).filter((video: any) => video.videoUrl),
          })
        }

        if (Array.isArray(item.unitTypes) && item.unitTypes.length > 0) {
          for (let idx = 0; idx < item.unitTypes.length; idx++) {
            const ut = item.unitTypes[idx]
            const createdType = await prisma.projectUnitType.create({
              data: {
                projectId: project.id,
                unitType: (ut.name || ut.unitType || `Unit Type ${idx + 1}`).trim(),
                bedrooms: ut.bedrooms ?? null,
                bathrooms: ut.bathrooms ?? null,
                sizeFrom: ut.sizeMin ?? ut.sizeFrom ?? null,
                sizeTo: ut.sizeMax ?? ut.sizeTo ?? null,
                priceFrom: parseAEDInput(ut.priceFrom) ?? null,
                sortOrder: idx,
              },
              select: { id: true },
            })

            for (let vIdx = 0; vIdx < (ut.variants || []).length; vIdx++) {
              const variant = ut.variants[vIdx]
              const variantPrice = parseAEDInput(variant.price)
              const createdVariant = await prisma.projectUnitVariant.create({
                data: {
                  projectId: project.id,
                  unitTypeId: createdType.id,
                  title: String(variant.title || 'Variant').trim(),
                  size: variant.size ?? null,
                  price: variantPrice ?? null,
                  pricePerSqft: variantPrice !== null && Number(variant.size ?? 0) > 0 ? variantPrice / Number(variant.size) : null,
                  availabilityStatus: variant.availabilityStatus || ((variant.availableUnitsCount ?? 1) === 0 ? 'SOLD_OUT' : 'AVAILABLE'),
                  availableUnitsCount: variant.availableUnitsCount ?? null,
                  priceOnRequest: variant.priceOnRequest ?? (variantPrice === null),
                  sortOrder: vIdx,
                },
                select: { id: true },
              })

              const floorPlans = Array.isArray(variant.floorPlans) ? variant.floorPlans.filter((fp: any) => String(fp.imageUrl || '').trim()) : []
              if (floorPlans.length > 0) {
                await prisma.projectFloorPlan.createMany({
                  data: floorPlans.map((fp: any) => ({
                    projectId: project.id,
                    unitVariantId: createdVariant.id,
                    unitType: fp.title?.trim() || String(variant.title || 'Variant').trim(),
                    bedrooms: fp.bedrooms ?? null,
                    bathrooms: fp.bathrooms ?? null,
                    size: fp.size?.trim() || null,
                    price: fp.price?.trim() || null,
                    imageUrl: fp.imageUrl?.trim() || null,
                  })),
                })
              }
            }
          }
        }

        if (Array.isArray(item.floorPlans) && item.floorPlans.length > 0) {
          await prisma.projectFloorPlan.createMany({
            data: item.floorPlans.filter((fp: any) => String(fp.imageUrl || '').trim()).map((fp: any, idx: number) => ({
              projectId: project.id,
              unitVariantId: null,
              unitType: fp.unitType?.trim() || 'Floor Plan',
              bedrooms: fp.bedrooms ?? null,
              bathrooms: fp.bathrooms ?? null,
              size: fp.size?.trim() || null,
              price: fp.price?.trim() || null,
              imageUrl: fp.imageUrl?.trim() || null,
            })),
          })
        }

        results.push({ name: item.name, slug: project.slug, status: 'created' })
      } catch (err: any) {
        results.push({ name: item.name, slug: item.slug || slugify(item.name), status: 'error', reason: err.message || 'Unknown error' })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Approved import created successfully.',
      summary: {
        total: approvedProjects.length,
        created: results.filter((r) => r.status === 'created').length,
        skipped: results.filter((r) => r.status === 'skipped').length,
        errored: results.filter((r) => r.status === 'error').length,
      },
      results,
    }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/admin/projects/bulk-import/approve]', err)
    return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
  }
}
