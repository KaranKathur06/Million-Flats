import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyAdminNewLead } from '@/lib/leads/notifications'
import { formatEcosystemLeadEmail, sendEmail } from '@/lib/email/sendEmail'

export async function POST(
  request: Request,
  { params }: { params: { categorySlug: string; partnerSlug: string } }
) {
  try {
    const categorySlug = decodeURIComponent(params.categorySlug || '').trim().toLowerCase()
    const partnerSlug = decodeURIComponent(params.partnerSlug || '').trim().toLowerCase()

    if (!categorySlug || !partnerSlug) {
      return NextResponse.json({ success: false, message: 'Invalid partner route.' }, { status: 400 })
    }

    const body = await request.json()
    const { name, email, phone, city, propertyType, budget, requirement, message } = body

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, message: 'Name is required.' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, message: 'Valid email is required.' }, { status: 400 })
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 5) {
      return NextResponse.json({ success: false, message: 'Phone is required.' }, { status: 400 })
    }

    const partner = await (prisma as any).ecosystemPartner.findFirst({
      where: {
        slug: partnerSlug,
        isActive: true,
        status: 'APPROVED',
        category: { slug: categorySlug, isActive: true },
      },
      include: { category: { select: { id: true, slug: true, title: true } } },
    })

    if (!partner) {
      return NextResponse.json({ success: false, message: 'Partner not found.' }, { status: 404 })
    }

    const sourcePage = `/ecosystem-partners/${categorySlug}/${partnerSlug}`
    const fullMessage = [
      requirement ? `Requirement: ${requirement}` : null,
      message ? String(message).trim() : null,
    ]
      .filter(Boolean)
      .join('\n\n')

    const ecosystemLead = await (prisma as any).ecosystemLead.create({
      data: {
        categoryId: partner.category.id,
        partnerId: partner.id,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        message: fullMessage || 'Consultation request via partner profile',
        city: city?.trim() || null,
        propertyType: propertyType?.trim() || null,
        budgetRange: budget?.trim() || null,
        requirement: requirement?.trim() || null,
        source: 'partner_profile',
        sourcePage,
        leadSource: 'Ecosystem Partner Lead',
      },
      select: { id: true },
    })

    const crmLead = await (prisma as any).lead.create({
      data: {
        leadType: 'ECOSYSTEM',
        category: 'Ecosystem Partner Lead',
        sourceId: partner.id,
        sourceName: partner.name,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        message: fullMessage || null,
        propertyType: propertyType?.trim() || null,
        budgetRange: budget?.trim() || null,
        country: 'INDIA',
        status: 'NEW',
        ecosystemPartnerId: partner.id,
        landingUrl: sourcePage,
        metadata: {
          partnerCategory: partner.category.title,
          partnerCategorySlug: partner.category.slug,
          partnerName: partner.name,
          partnerSlug: partner.slug,
          city: city?.trim() || null,
          requirement: requirement?.trim() || null,
          leadSource: 'Ecosystem Partner Lead',
          ecosystemLeadId: ecosystemLead.id,
        },
      },
      select: { id: true },
    })

    await notifyAdminNewLead({
      leadType: 'ECOSYSTEM',
      leadId: crmLead.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      category: 'Ecosystem Partner Lead',
      projectOrCompany: partner.name,
      message: fullMessage || undefined,
      propertyName: city?.trim() || undefined,
      budgetRange: budget?.trim() || undefined,
    }).catch(() => null)

    const notifyTo = String(process.env.ECOSYSTEM_LEADS_NOTIFY_EMAIL || '').trim()
    if (notifyTo) {
      const emailPayload = formatEcosystemLeadEmail({
        leadId: ecosystemLead.id,
        categorySlug: partner.category.slug,
        partnerId: partner.id,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: fullMessage,
        source: `Partner Profile: ${partner.name}`,
      })
      await sendEmail({ to: notifyTo, subject: emailPayload.subject, text: emailPayload.text }).catch(() => null)
    }

    return NextResponse.json({ success: true, message: 'Consultation request submitted.' })
  } catch (error) {
    console.error('Partner inquiry error:', error)
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
