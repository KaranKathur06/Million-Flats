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

    const userId = (session.user as any)?.id as string
    const userRole = (session.user as any)?.role

    const allowedRoles = ['ADMIN', 'EDITOR']
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 })
    }

    const blog = await (prisma as any).blog.findUnique({
      where: { id: params.id },
    })

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    // Editors can only publish their own blogs
    if (userRole === 'EDITOR' && blog.authorId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Can only publish own blogs' },
        { status: 403 }
      )
    }

    await (prisma as any).blog.update({
      where: { id: params.id },
      data: {
        status: 'PUBLISHED',
        publishAt: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Publish blog error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to publish blog' },
      { status: 500 }
    )
  }
}