import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, description, parentId } = body

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'Category name is required' },
        { status: 400 }
      )
    }

    const category = await (prisma as any).category.update({
      where: { id: params.id },
      data: {
        name,
        slug: generateSlug(name),
        description,
        parentId: parentId || null,
      },
    })

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    console.error('Update category error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    // Check if category has blogs
    const blogCount = await (prisma as any).blog.count({
      where: { categoryId: params.id },
    })

    if (blogCount > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete category with associated blogs' },
        { status: 400 }
      )
    }

    await (prisma as any).category.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true })
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