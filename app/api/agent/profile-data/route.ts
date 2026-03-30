import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = String((session.user as any)?.role || '').toUpperCase()
    if (role !== 'AGENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const email = String((session.user as any).email || '').trim().toLowerCase()
    if (!email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 })
    }

    // Find user and include agent relation
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        agent: {
          select: {
            id: true,
            status: true,
            company: true,
            license: true,
            bio: true,
            whatsapp: true,
            profileImageUrl: true,
            profilePhoto: true,
          } as any,
        },
      },
    }) as any

    if (!user?.agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    const agent = user.agent

    const MIN_BIO_LENGTH = 150
    const name = String(user?.name || '').trim()
    const phone = String(user?.phone || '').trim()
    const company = String(agent?.company || '').trim()
    const license = String(agent?.license || '').trim()
    const bio = String(agent?.bio || '').trim()
    const photo = String(agent?.profileImageUrl || agent?.profilePhoto || '').trim()

    const checks = [
      Boolean(name),
      Boolean(phone),
      Boolean(photo),
      bio.length >= MIN_BIO_LENGTH,
      Boolean(company),
      Boolean(license),
    ]
    const completed = checks.filter(Boolean).length
    const computedProfileCompletion = Math.round((completed / checks.length) * 100)

    return NextResponse.json({
      status: agent.status || 'REGISTERED',
      profileCompletion: computedProfileCompletion,
      profileImageUrl: agent.profileImageUrl || agent.profilePhoto || null,
    })
  } catch (error) {
    console.error('Error fetching agent profile data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
