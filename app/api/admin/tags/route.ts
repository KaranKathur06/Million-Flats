import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const tags = await (prisma as any).tag.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: tags })
  } catch (error) {
    console.error('Get tags error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch tags' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (!['ADMIN', 'EDITOR'].includes(userRole)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) {
      return NextResponse.json({ success: false, message: 'Tag name is required' }, { status: 400 })
    }

    const slug = generateSlug(name)

    const existing = await (prisma as any).tag.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ success: true, data: existing })
    }

    const tag = await (prisma as any).tag.create({
      data: {
        name,
        slug,
      },
    })

    return NextResponse.json({ success: true, data: tag })
  } catch (error) {
    console.error('Create tag error:', error)
    return NextResponse.json({ success: false, message: 'Failed to create tag' }, { status: 500 })
  }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
