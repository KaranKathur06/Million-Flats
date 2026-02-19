import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { uploadToS3 } from '@/lib/s3'
import { getEcosystemRegistrationConfig } from '@/lib/ecosystem/ecosystemCategoryConfig'

export const runtime = 'nodejs'

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

function normalizeEmail(v: unknown) {
  return safeString(v).toLowerCase()
}

function sanitizeText(v: unknown) {
  const s = safeString(v)
  if (!s) return ''
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCommaSeparated(v: unknown) {
  const raw = safeString(v)
  if (!raw) return [] as string[]
  return raw
    .split(',')
    .map((x) => sanitizeText(x))
    .filter(Boolean)
    .slice(0, 50)
}

function parseJsonArray(v: unknown) {
  if (typeof v !== 'string') return [] as string[]
  const trimmed = v.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed.map((x) => sanitizeText(x)).filter(Boolean).slice(0, 100) : []
  } catch {
    return parseCommaSeparated(trimmed)
  }
}

function isAllowedImageType(mime: string) {
  const m = (mime || '').toLowerCase()
  return m === 'image/jpeg' || m === 'image/png' || m === 'image/webp'
}

async function uploadOptionalImage(params: { form: FormData; name: string; folder: string }) {
  const file = params.form.get(params.name)
  if (!file || !(file instanceof File)) return null

  const mime = file.type || ''
  if (!isAllowedImageType(mime)) throw new Error('Invalid file type')
  if (file.size > 2 * 1024 * 1024) throw new Error('File too large')

  const buf = Buffer.from(await file.arrayBuffer())
  const uploaded = await uploadToS3({
    buffer: buf,
    folder: params.folder,
    filename: file.name || params.name,
    contentType: mime || 'application/octet-stream',
  })
  return uploaded.objectUrl
}

const AllowedSlugSchema = z.string().min(1)

export async function POST(req: Request) {
  try {
    const form = await req.formData()

    const slug = AllowedSlugSchema.parse(safeString(form.get('category')))
    const cfg = getEcosystemRegistrationConfig(slug)
    if (!cfg) return bad('Invalid category', 400)

    const category = await (prisma as any).ecosystemCategory.findUnique({ where: { slug: cfg.slug }, select: { id: true } })
    if (!category) return bad('Invalid category', 400)

    const email = normalizeEmail(form.get('email'))
    if (!email) return bad('Email is required', 400)

    const existing = await (prisma as any).ecosystemPartner.findFirst({
      where: {
        categoryId: category.id,
        contactEmail: email,
      },
      select: { id: true },
    })

    if (existing) return bad('This email is already registered for this category.', 400)

    const businessName = sanitizeText(form.get('businessName'))
    const contactPerson = sanitizeText(form.get('contactPerson'))
    const phone = sanitizeText(form.get('phone'))

    if (!businessName) return bad('Business Name is required', 400)
    if (!contactPerson) return bad('Contact Person is required', 400)
    if (!phone) return bad('Phone is required', 400)

    const description = sanitizeText(form.get('description'))
    if (!description) return bad('Business Description is required', 400)

    const yearsExperienceRaw = safeString(form.get('yearsExperience'))
    const yearsExperience = yearsExperienceRaw ? Number(yearsExperienceRaw) : null

    const serviceAreas = parseCommaSeparated(form.get('serviceAreas'))

    const pricingRange = sanitizeText(form.get('pricingRange'))
    const whatsapp = sanitizeText(form.get('whatsapp'))
    const website = sanitizeText(form.get('website'))

    const registrationNumber = sanitizeText(form.get('registrationNumber'))
    const gstNumber = sanitizeText(form.get('gstNumber'))

    const extra: Record<string, unknown> = {}
    for (const f of cfg.extraFields) {
      const key = (f as any).name as string
      if (!key) continue

      const raw = form.get(key)
      if (raw === null || raw === undefined) continue

      if (f.type === 'multiselect') {
        extra[key] = parseJsonArray(raw)
      } else if (f.type === 'number') {
        const n = Number(safeString(raw))
        if (Number.isFinite(n)) extra[key] = n
      } else if (f.type === 'file') {
        // handled separately (certificate/logo)
      } else {
        extra[key] = sanitizeText(raw)
      }
    }

    const seed = `${Date.now()}-${Math.random().toString(16).slice(2)}`

    const logo = await uploadOptionalImage({
      form,
      name: 'logo',
      folder: `ecosystem/registrations/${cfg.slug}/${seed}/logo`,
    }).catch((e) => {
      throw new Error(e instanceof Error ? e.message : 'Logo upload failed')
    })

    const certificate = await uploadOptionalImage({
      form,
      name: 'certificate',
      folder: `ecosystem/registrations/${cfg.slug}/${seed}/certificate`,
    }).catch(() => null)

    const created = await (prisma as any).ecosystemPartner.create({
      data: {
        categoryId: category.id,
        name: businessName,
        contactPerson,
        contactEmail: email,
        contactPhone: phone,
        whatsapp: whatsapp || null,
        website: website || null,
        description,
        yearsExperience: typeof yearsExperience === 'number' && Number.isFinite(yearsExperience) ? Math.max(0, Math.floor(yearsExperience)) : null,
        pricingRange: pricingRange || null,
        serviceAreas: serviceAreas.length ? serviceAreas : undefined,
        gstNumber: gstNumber || null,
        registrationNumber: registrationNumber || null,
        categoryData: Object.keys(extra).length ? extra : undefined,
        logo: logo || null,
        coverImage: null,
        shortDescription: description.slice(0, 180),
        rating: null,
        locationCoverage: serviceAreas.join(', ') || null,
        status: 'PENDING',
        isVerified: false,
        isFeatured: false,
        subscriptionTier: 'FREE',
        isActive: true,
      } as any,
      select: { id: true, status: true, createdAt: true },
    })

    return NextResponse.json({ success: true, partner: created, uploads: { certificateUrl: certificate } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    if (msg.includes('Invalid file type')) return bad('Invalid file type. Only JPG/PNG/WebP allowed.', 400)
    if (msg.includes('File too large')) return bad('File too large (max 2MB).', 400)
    if (msg.includes('Invalid')) return bad('Invalid request', 400)
    return bad(msg || 'Internal server error', 500)
  }
}
