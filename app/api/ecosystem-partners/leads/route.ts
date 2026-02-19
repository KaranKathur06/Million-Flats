import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const LeadSchema = z.object({
  categorySlug: z.string().min(1),
  partnerId: z.string().min(1).optional().nullable(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(5),
  message: z.string().min(1),
  source: z.string().optional(),
})

function bad(message: string, status = 400) {
  return NextResponse.json({ success: false, message }, { status })
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null)
    const payload = LeadSchema.parse(json)

    const category = await prisma.ecosystemCategory.findUnique({
      where: { slug: payload.categorySlug },
      select: { id: true },
    })

    if (!category) return bad('Invalid category', 400)

    const created = await prisma.ecosystemLead.create({
      data: {
        categoryId: category.id,
        partnerId: payload.partnerId || null,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        message: payload.message,
        source: payload.source || null,
      },
      select: { id: true, createdAt: true },
    })

    return NextResponse.json({ success: true, lead: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    if (msg.includes('Invalid')) return bad('Invalid payload', 400)
    return bad(msg || 'Internal server error', 500)
  }
}
