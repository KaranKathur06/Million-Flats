import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { formatEcosystemLeadEmail, sendEmail } from '@/lib/email'

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

    const category = await (prisma as any).ecosystemCategory.findUnique({
      where: { slug: payload.categorySlug },
      select: { id: true },
    })

    if (!category) return bad('Invalid category', 400)

    let partnerId: string | null = payload.partnerId ? String(payload.partnerId) : null

    if (!partnerId) {
      const partners = await (prisma as any).ecosystemPartner
        .findMany({
          where: {
            categoryId: category.id,
            isActive: true,
            status: 'APPROVED',
          },
          orderBy: [{ isFeatured: 'desc' }, { priorityOrder: 'asc' }, { createdAt: 'asc' }],
          select: { id: true, isFeatured: true, priorityOrder: true, createdAt: true },
          take: 200,
        })
        .catch(() => [])

      if (Array.isArray(partners) && partners.length) {
        const featured = partners.filter((p: any) => Boolean(p.isFeatured))
        const eligible = featured.length ? featured : partners
        const ids = eligible.map((p: any) => String(p.id))

        try {
          const grouped = await (prisma as any).ecosystemLead.groupBy({
            by: ['partnerId'],
            where: {
              categoryId: category.id,
              partnerId: { in: ids },
              createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
            },
            _count: { _all: true },
          })

          const counts = new Map<string, number>()
          for (const g of grouped as any[]) {
            const pid = String(g.partnerId)
            const c = typeof g._count?._all === 'number' ? g._count._all : 0
            counts.set(pid, c)
          }

          let bestId = ids[0]
          let bestCount = counts.get(bestId) ?? 0
          for (const pid of ids) {
            const c = counts.get(pid) ?? 0
            if (c < bestCount) {
              bestCount = c
              bestId = pid
            }
          }
          partnerId = bestId
        } catch {
          partnerId = ids[0]
        }
      }
    }

    const created = await (prisma as any).ecosystemLead.create({
      data: {
        categoryId: category.id,
        partnerId: partnerId || null,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        message: payload.message,
        source: payload.source || null,
      },
      select: { id: true, createdAt: true },
    })

    const notifyTo = String(process.env.ECOSYSTEM_LEADS_NOTIFY_EMAIL || '').trim()
    if (notifyTo) {
      const email = formatEcosystemLeadEmail({
        leadId: created.id,
        categorySlug: payload.categorySlug,
        partnerId: partnerId || null,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        message: payload.message,
        source: payload.source || null,
      })

      await sendEmail({ to: notifyTo, subject: email.subject, text: email.text }).catch(() => null)
    }

    return NextResponse.json({ success: true, lead: created })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Request failed'
    if (msg.includes('Invalid')) return bad('Invalid payload', 400)
    return bad(msg || 'Internal server error', 500)
  }
}
