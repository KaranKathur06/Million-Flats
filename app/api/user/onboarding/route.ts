import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const email = String((session.user as any).email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'User email not found' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => null)

    const name = safeString(body?.name)
    const phone = safeString(body?.phone)
    const city = safeString(body?.city)
    const community = safeString(body?.community)
    const propertyType = Array.isArray(body?.propertyType) ? body.propertyType : []
    const budget = safeString(body?.budget)
    const timeline = safeString(body?.timeline)

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: 'Name and phone are required' },
        { status: 400 }
      )
    }

    // Update user profile with onboarding data
    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        profileCompletion: 100,
      },
    })

    const countryCode = (() => {
      const iso2 = String(updatedUser.countryIso2 || '').toUpperCase()
      if (iso2 === 'IN') return 'INDIA'
      return 'UAE'
    })()

    const preferenceData = {
      city: city || null,
      community: community || null,
      filters: {
        propertyType,
        budget,
        timeline,
      },
    }

    try {
      const existingPref = await (prisma as any).userPreference
        .findUnique({
          where: { userId: updatedUser.id },
        })
        .catch(() => null)

      if (existingPref) {
        await (prisma as any).userPreference.update({
          where: { userId: updatedUser.id },
          data: preferenceData,
        })
      } else {
        await (prisma as any).userPreference.create({
          data: {
            userId: updatedUser.id,
            countryCode,
            ...preferenceData,
          },
        })
      }
    } catch (error) {
      console.warn('[user/onboarding] Could not save preferences:', error)
      // Continue anyway - preferences are optional
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Onboarding completed successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[user/onboarding] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
