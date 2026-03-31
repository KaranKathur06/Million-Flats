import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'
import { deleteFromS3, extractS3KeyFromUrl } from '@/lib/s3'
import { BLOGS_CACHE_TAG } from '@/lib/blogs/public'

export const runtime = 'nodejs'

function isBlogPublicKey(key: string) {
  return key.startsWith('public/blogs/')
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  }

  try {
    const blog = await (prisma as any).blog.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, featuredImageUrl: true },
    })

    if (!blog) {
      return NextResponse.json({ success: false, message: 'Blog not found' }, { status: 404 })
    }

    const imageUrl = String(blog.featuredImageUrl || '').trim()
    const key = imageUrl ? extractS3KeyFromUrl(imageUrl) : null

    if (key && isBlogPublicKey(key)) {
      await deleteFromS3(key).catch((error) => {
        console.warn('[DELETE featured-image] S3 deletion warning:', error)
      })
    }

    await (prisma as any).blog.update({
      where: { id: blog.id },
      data: {
        featuredImageUrl: null,
        featuredImageAlt: null,
      },
    })

    revalidateTag(BLOGS_CACHE_TAG)
    revalidatePath('/blogs')
    if (blog.slug) revalidatePath(`/blogs/${blog.slug}`)
    revalidatePath('/admin/blogs/all')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/blogs/[id]/featured-image] failed:', error)
    return NextResponse.json({ success: false, message: 'Failed to remove featured image' }, { status: 500 })
  }
}
