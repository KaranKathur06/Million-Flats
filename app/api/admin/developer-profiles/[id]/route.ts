import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ADMIN_ROLES = ['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER']

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return null
  const role = String((session.user as any)?.role || '').toUpperCase()
  if (!ADMIN_ROLES.includes(role)) return null
  return session.user
}

/**
 * GET /api/admin/developer-profiles/[id]
 * Returns full profile for admin review panel.
 */
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const profile = await (prisma as any).developerProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
      documents: { orderBy: { createdAt: 'desc' } },
      linkedDeveloper: { select: { id: true, name: true, slug: true, logo: true } },
    },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json({ profile })
}

/**
 * PATCH /api/admin/developer-profiles/[id]
 * Handles all admin actions via `action` field in body.
 *
 * Actions:
 *  APPROVE          — Set APPROVED + KYC=VERIFIED, create developers row if not linked
 *  REJECT           — Set REJECTED + rejectionReason, notify developer
 *  SUSPEND          — Set SUSPENDED
 *  REACTIVATE       — Restore to APPROVED
 *  SAVE_NOTES       — Save adminNotes
 *  LINK_DEVELOPER   — Link/unlink to a developers row
 *  SET_VERIX_SCORE  — Override verixDeveloperScore
 *  TOGGLE_FEATURED  — Toggle isFeatured
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const body = await req.json()
  const action: string = body?.action || ''
  const adminNotes: string = body?.adminNotes || ''

  const profile = await (prisma as any).developerProfile.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, email: true, name: true } }, linkedDeveloper: true },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  switch (action) {

    case 'APPROVE': {
      // Determine which developers row to link
      let developerId = profile.linkedDeveloperId

      // If no link, auto-create a new developers row
      if (!developerId && profile.companyName) {
        const baseSlug = profile.companyName
          .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const slug = `${baseSlug}-${Date.now()}`

        const devRow = await (prisma as any).developer.create({
          data: {
            name: profile.companyName,
            slug,
            countryCode: 'UAE',
            status: 'ACTIVE',
            website: profile.website || null,
            foundedYear: profile.foundedYear || null,
            headquarters: profile.headquarters || null,
          },
          select: { id: true },
        })
        developerId = devRow.id
      }

      const updated = await (prisma as any).developerProfile.update({
        where: { id: params.id },
        data: {
          onboardingStatus: 'APPROVED',
          kycStatus: 'VERIFIED',
          isVerified: true,
          verifiedAt: new Date(),
          linkedDeveloperId: developerId || null,
          adminNotes: adminNotes || profile.adminNotes,
          rejectionReason: null,
        },
      })

      // Audit log
      await (prisma as any).auditLog.create({
        data: {
          action: 'DEVELOPER_PROFILE_APPROVED',
          entityType: 'DEVELOPER_PROFILE',
          entityId: params.id,
          performedById: (admin as any).id || null,
          details: { companyName: profile.companyName, linkedDeveloperId: developerId },
        },
      }).catch(() => null)

      return NextResponse.json({ message: `${profile.companyName} approved successfully.`, profile: updated })
    }

    case 'REJECT': {
      const rejectionReason = typeof body?.rejectionReason === 'string' ? body.rejectionReason.trim() : ''
      if (!rejectionReason) return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })

      const updated = await (prisma as any).developerProfile.update({
        where: { id: params.id },
        data: {
          onboardingStatus: 'REJECTED',
          kycStatus: 'REJECTED',
          isVerified: false,
          rejectionReason,
          adminNotes: adminNotes || profile.adminNotes,
        },
      })

      // Notify developer
      await (prisma as any).developerNotification.create({
        data: {
          developerProfileId: params.id,
          type: 'APPLICATION_REJECTED',
          title: 'Application Not Approved',
          message: `Your developer application was not approved. Reason: ${rejectionReason}`,
        },
      }).catch(() => null)

      return NextResponse.json({ message: 'Application rejected.', profile: updated })
    }

    case 'SUSPEND': {
      const updated = await (prisma as any).developerProfile.update({
        where: { id: params.id },
        data: { onboardingStatus: 'SUSPENDED', isVerified: false, adminNotes: adminNotes || profile.adminNotes },
      })
      await (prisma as any).developerNotification.create({
        data: {
          developerProfileId: params.id,
          type: 'ACCOUNT_SUSPENDED',
          title: 'Account Suspended',
          message: 'Your developer account has been suspended. Please contact support.',
        },
      }).catch(() => null)
      return NextResponse.json({ message: 'Account suspended.', profile: updated })
    }

    case 'REACTIVATE': {
      const updated = await (prisma as any).developerProfile.update({
        where: { id: params.id },
        data: { onboardingStatus: 'APPROVED', kycStatus: 'VERIFIED', isVerified: true, rejectionReason: null, adminNotes: adminNotes || profile.adminNotes },
      })
      await (prisma as any).developerNotification.create({
        data: {
          developerProfileId: params.id,
          type: 'GENERAL',
          title: 'Account Reactivated',
          message: 'Your developer account has been reactivated. You can now publish projects.',
        },
      }).catch(() => null)
      return NextResponse.json({ message: 'Account reactivated.', profile: updated })
    }

    case 'SAVE_NOTES': {
      const updated = await (prisma as any).developerProfile.update({
        where: { id: params.id },
        data: { adminNotes },
      })
      return NextResponse.json({ message: 'Notes saved.', profile: updated })
    }

    case 'LINK_DEVELOPER': {
      const developerId = body?.developerId || null

      const updated = await (prisma as any).developerProfile.update({
        where: { id: params.id },
        data: { linkedDeveloperId: developerId },
      })
      return NextResponse.json({
        message: developerId ? 'Developer linked successfully.' : 'Developer link removed.',
        profile: updated,
      })
    }

    case 'SET_VERIX_SCORE': {
      const score = body?.verixDeveloperScore
      const updated = await (prisma as any).developerProfile.update({
        where: { id: params.id },
        data: { verixDeveloperScore: score !== null && score !== undefined ? parseInt(score) : null },
      })
      return NextResponse.json({ message: 'Verix score updated.', profile: updated })
    }

    case 'TOGGLE_FEATURED': {
      const updated = await (prisma as any).developerProfile.update({
        where: { id: params.id },
        data: { isFeatured: !profile.isFeatured },
      })
      return NextResponse.json({ message: `Featured ${updated.isFeatured ? 'enabled' : 'disabled'}.`, profile: updated })
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}
