import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const categories = await (prisma as any).category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    console.error('Get categories error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch categories' },
      { status: 500 }
    )
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
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { name, description, parentId } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()
    const slug = generateSlug(trimmedName)

    // Check for duplicate slug
    const existingCategory = await (prisma as any).category.findUnique({
      where: { slug },
      select: { id: true, name: true },
    })

    if (existingCategory) {
      return NextResponse.json(
        { success: false, message: `Category "${existingCategory.name}" already exists with this slug` },
        { status: 409 }
      )
    }

    const category = await (prisma as any).category.create({
      data: {
        name: trimmedName,
        slug,
        description: description || null,
        parentId: parentId || null,
      },
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error: any) {
    console.error('Create category error:', error)
    
    // Handle Prisma unique constraint error
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, message: 'A category with this name already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: 500 }
    )
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