import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasMinRole, normalizeRole } from '@/lib/rbac'

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

    console.log('CATEGORIES FETCHED:', categories.length)
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

    const userRole = normalizeRole((session.user as any)?.role)
    if (!hasMinRole(userRole, 'ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    const name = safeString(body?.name)
    const description = typeof body?.description === 'string' ? body.description : undefined
    const parentId = safeString(body?.parentId) || null

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      )
    }

    const slug = safeString(body?.slug) || generateSlug(name)

    const existing = await (prisma as any).category.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Category already exists' },
        { status: 409 }
      )
    }

    const category = await (prisma as any).category.create({
      data: {
        name,
        slug,
        description,
        parentId,
      },
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    })

    if (!category) {
      console.error('CATEGORY CREATE FAILED: prisma returned null')
      return NextResponse.json(
        { success: false, message: 'Failed to create category - DB returned null' },
        { status: 500 }
      )
    }

    console.log('CATEGORY CREATED:', category)
    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    console.error('Create category error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to create category' },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const userRole = normalizeRole((session.user as any)?.role)
    if (!hasMinRole(userRole, 'ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    const id = safeString(body?.id)
    const name = safeString(body?.name)
    const description = typeof body?.description === 'string' ? body.description.trim() : undefined
    const parentId = safeString(body?.parentId) || null

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Category ID is required' },
        { status: 400 }
      )
    }

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      )
    }

    // Check category exists
    const existing = await (prisma as any).category.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      )
    }

    const slug = safeString(body?.slug) || generateSlug(name)

    // Check slug uniqueness (excluding current category)
    const slugConflict = await (prisma as any).category.findFirst({
      where: { slug, NOT: { id } },
    })
    if (slugConflict) {
      return NextResponse.json(
        { success: false, message: 'A category with this slug already exists' },
        { status: 409 }
      )
    }

    const updateData: any = { name, slug }
    if (description !== undefined) updateData.description = description
    if (parentId !== undefined) updateData.parentId = parentId

    const category = await (prisma as any).category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { blogs: true },
        },
      },
    })

    if (!category) {
      console.error('CATEGORY UPDATE FAILED: prisma returned null for id:', id)
      return NextResponse.json(
        { success: false, message: 'Failed to update category' },
        { status: 500 }
      )
    }

    console.log('CATEGORY UPDATED:', category)
    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const userRole = normalizeRole((session.user as any)?.role)
    if (!hasMinRole(userRole, 'ADMIN')) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const id = safeString(searchParams.get('id'))

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Category ID is required' },
        { status: 400 }
      )
    }

    // Check category exists
    const existing = await (prisma as any).category.findUnique({
      where: { id },
      include: { _count: { select: { blogs: true } } },
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, message: 'Category not found' },
        { status: 404 }
      )
    }

    // Prevent deletion if category has blogs
    if (existing._count?.blogs > 0) {
      return NextResponse.json(
        { success: false, message: `Cannot delete category with ${existing._count.blogs} blog(s). Move or delete the blogs first.` },
        { status: 409 }
      )
    }

    await (prisma as any).category.delete({ where: { id } })

    console.log('CATEGORY DELETED:', id)
    return NextResponse.json({ success: true, message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Delete category error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete category' },
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