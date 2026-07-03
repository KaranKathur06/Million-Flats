import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/adminAuth'
import { getUserHealthScore, getLifecycleStage, getCRMStage, getRecommendationConfidence } from '@/lib/userIntelligence'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  const userId = safeString(params?.id)
  if (!userId) {
    return NextResponse.json({ success: false, message: 'User ID is required.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      country: { select: { name: true, iso2: true } },
      buyer: { select: { propertyType: true, budgetRange: true } },
      agent: { select: { id: true } },
      developerProfile: { select: { id: true } },
      whatsappAuthSessions: {
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          sessionId: true,
          status: true,
          device: true,
          ipAddress: true,
          userAgent: true,
          otpSentAt: true,
          verifiedAt: true,
          createdAt: true,
        },
      },
      _count: {
        select: {
          savedProperties: true,
          propertyLeads: true,
          whatsappAuthSessions: true,
          auditLogs: true,
        },
      },
    },
  })

  if (!user) {
    return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 })
  }

  const missingFields: string[] = []
  if (!safeString(user.name)) missingFields.push('Name')
  if (!safeString(user.phone)) missingFields.push('WhatsApp number')
  if (!safeString(user.country?.name)) missingFields.push('Country')
  if (!safeString(user.email) || /^wa_\d+@millionflats\.auth$/i.test(user.email)) missingFields.push('Email')
  if (!safeString(user.image)) missingFields.push('Avatar')
  if (user.profileCompletion < 100) missingFields.push('Profile completion')

  const intelligence = {
    whatsappVerified: user.whatsappVerified,
    emailVerified: user.emailVerified,
    profileCompletion: user.profileCompletion,
    status: user.status,
    savedPropertiesCount: user._count.savedProperties,
    propertyLeadsCount: user._count.propertyLeads,
    whatsappSessionsCount: user._count.whatsappAuthSessions,
    lastWhatsappLogin: user.lastWhatsappLogin,
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      authProvider: user.authProvider,
      role: user.role,
      status: user.status,
      image: user.image,
      country: user.country?.name || user.country?.iso2 || null,
      countryIso2: user.country?.iso2 || null,
      whatsappVerified: user.whatsappVerified,
      phoneVerified: user.phoneVerified,
      emailVerified: user.emailVerified,
      profileCompletion: user.profileCompletion,
      lastWhatsappLogin: user.lastWhatsappLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      buyerType: user.buyer?.propertyType || null,
      buyerBudget: user.buyer?.budgetRange || null,
      agentId: user.agent?.id,
      developerProfileId: user.developerProfile?.id,
      savedPropertiesCount: user._count.savedProperties,
      propertyLeadsCount: user._count.propertyLeads,
      whatsappSessionsCount: user._count.whatsappAuthSessions,
      auditLogCount: user._count.auditLogs,
      recentSessions: user.whatsappAuthSessions,
      missingFields,
      healthScore: getUserHealthScore(intelligence),
      lifecycleStage: getLifecycleStage(intelligence),
      crmStage: getCRMStage(intelligence),
      recommendationConfidence: getRecommendationConfidence(intelligence),
    },
  })
}
