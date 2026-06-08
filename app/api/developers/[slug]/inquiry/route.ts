import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = decodeURIComponent(String(params.slug || '')).trim().toLowerCase()
    if (!slug) {
      return NextResponse.json(
        { success: false, message: 'Developer slug is required.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, email, phone, country, interestedProject, message } = body

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: 'Name is required (min 2 characters).' },
        { status: 400 }
      )
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'A valid email address is required.' },
        { status: 400 }
      )
    }

    // Find the developer
    const developer = await (prisma as any).developer.findFirst({
      where: { slug, status: 'ACTIVE' },
      select: { id: true, name: true },
    })

    if (!developer) {
      return NextResponse.json(
        { success: false, message: 'Developer not found.' },
        { status: 404 }
      )
    }

    // Create Lead
    await (prisma as any).lead.create({
      data: {
        leadType: 'DEVELOPER',
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        country: country === 'INDIA' ? 'INDIA' : 'UAE',
        message: message?.trim() || null,
        developerId: developer.id,
        projectId: interestedProject?.trim() || null,
        sourceName: developer.name,
        category: 'Developer Inquiry',
        status: 'NEW',
        landingUrl: `/developers/${slug}`,
      },
    })

    return NextResponse.json({ success: true, message: 'Inquiry submitted successfully.' })
  } catch (error) {
    console.error('Developer inquiry error:', error)
    return NextResponse.json(
      { success: false, message: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
