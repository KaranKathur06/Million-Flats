import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agencyName, email, phone, country, state, city, agencySize, website, specializations } = body

    if (!agencyName || !email || !phone) {
      return NextResponse.json({ error: 'Agency name, email, and phone are required' }, { status: 400 })
    }

    // Check for existing user with this email or phone
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    })

    if (existing) {
      if (existing.role === 'AGENCY') {
        return NextResponse.json({ error: 'An agency account already exists with this email or phone' }, { status: 409 })
      }
      return NextResponse.json({ error: 'This email or phone is already registered with a different role' }, { status: 409 })
    }

    // Atomic: create user + agencyProfile
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          role: 'AGENCY',
          email,
          phone,
          name: agencyName,
        },
      })

      const agencyProfile = await tx.agencyProfile.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          agencyName,
          email,
          phone,
          country: country || null,
          state: state || null,
          city: city || null,
          agencySize: agencySize || null,
          website: website || null,
          specializations: Array.isArray(specializations) ? specializations : [],
          onboardingStatus: 'REGISTERED',
          kycStatus: 'PENDING',
        },
      })

      return { user, agencyProfile }
    })

    return NextResponse.json({
      success: true,
      userId: result.user.id,
      agencyProfileId: result.agencyProfile.id,
    })
  } catch (error: any) {
    console.error('[agency/register]', error)
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
