import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = (session.user as any)?.role
    if (!['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { action, agencyIds } = await request.json()

    if (!Array.isArray(agencyIds) || agencyIds.length === 0) {
      return NextResponse.json({ error: 'Invalid agency IDs' }, { status: 400 })
    }

    const allowedActions = ['approve', 'reject', 'suspend', 'reactivate']
    if (!allowedActions.includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const userId = (session.user as any)?.id
    const now = new Date()

    // Perform bulk action
    let updates: any = { updatedAt: now }

    switch (action) {
      case 'approve':
        updates = {
          ...updates,
          onboardingStatus: 'APPROVED',
          verificationStatus: 'VERIFIED',
          isVerified: true,
          verifiedAt: now,
          approvedBy: userId,
          approvedAt: now,
        }
        break
      case 'reject':
        updates = {
          ...updates,
          onboardingStatus: 'REJECTED',
          verificationStatus: 'REJECTED',
        }
        break
      case 'suspend':
        updates = {
          ...updates,
          onboardingStatus: 'SUSPENDED',
          suspendedAt: now,
          suspendedBy: userId,
        }
        break
      case 'reactivate':
        updates = {
          ...updates,
          onboardingStatus: 'APPROVED',
          suspendedAt: null,
          suspendedBy: null,
        }
        break
    }

    // Update all matching agencies
    const result = await (prisma as any).agencyProfile.updateMany({
      where: {
        id: { in: agencyIds },
      },
      data: updates,
    })

    return NextResponse.json({
      success: true,
      updated: result.count,
      action,
    })
  } catch (error) {
    console.error('Bulk action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
