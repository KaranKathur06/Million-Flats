import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBlogSlug } from '@/lib/blogs/public'

export async function POST(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = sanitizeBlogSlug(String(params.slug || ''))
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Invalid slug' }, { status: 400 })
    }

    const now = new Date()
    const blog = await (prisma as any).blog.findUnique({
      where: { slug },
      select: { id: true, status: true, publishAt: true },
    })

    if (!blog || blog.status !== 'PUBLISHED' || (blog.publishAt && new Date(blog.publishAt) > now)) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    await (prisma as any).blog.update({
      where: { id: blog.id },
      data: { views: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[POST /api/public/blogs/[slug]/view]', error)
    return NextResponse.json({ success: false, message: 'Failed to record view' }, { status: 500 })
  }
}

