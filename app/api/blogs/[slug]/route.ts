import { NextResponse } from 'next/server'
import { getPublishedBlogBySlug, sanitizeBlogSlug } from '@/lib/blogs/public'

export const revalidate = 60

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = sanitizeBlogSlug(params.slug)
    if (!slug) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    const blog = await getPublishedBlogBySlug(slug)

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    return NextResponse.json(
      { success: true, data: blog },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Blog detail fetch error:', error)
    return NextResponse.json({ success: false, message: 'Failed to fetch blog' }, { status: 500 })
  }
}

