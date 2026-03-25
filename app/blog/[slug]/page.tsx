import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BlogContentRenderer } from '@/components/admin/blogs/blog-content-renderer'
import type { Metadata } from 'next'

interface BlogPageProps {
  params: { slug: string }
}

async function getBlog(slug: string) {
  try {
    const blog = await (prisma as any).blog.findUnique({
      where: { slug },
      include: {
        author: { select: { name: true, image: true } },
        category: { select: { name: true, slug: true } },
        tags: {
          include: { tag: { select: { id: true, name: true, slug: true } } },
        },
      },
    })

    if (!blog || blog.status !== 'PUBLISHED') return null

    // Increment views
    ;(prisma as any).blog
      .update({ where: { id: blog.id }, data: { views: { increment: 1 } } })
      .catch(() => {})

    return {
      ...blog,
      tags: blog.tags?.map((bt: any) => bt.tag) || [],
    }
  } catch {
    return null
  }
}

async function getRelatedBlogs(categoryId: string, currentId: string) {
  try {
    const blogs = await (prisma as any).blog.findMany({
      where: {
        status: 'PUBLISHED',
        categoryId,
        NOT: { id: currentId },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        featuredImageUrl: true,
        readTimeMinutes: true,
        createdAt: true,
        category: { select: { name: true } },
      },
    })
    return blogs
  } catch {
    return []
  }
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const blog = await getBlog(params.slug)
  if (!blog) {
    return { title: 'Blog Not Found - MillionFlats' }
  }

  return {
    title: blog.metaTitle || blog.title,
    description: blog.metaDescription || blog.excerpt,
    openGraph: {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt,
      type: 'article',
      publishedTime: blog.publishAt?.toISOString() || blog.createdAt.toISOString(),
      authors: [blog.author?.name || 'MillionFlats'],
      images: blog.featuredImageUrl ? [{ url: blog.featuredImageUrl }] : [],
    },
    alternates: blog.canonicalUrl ? { canonical: blog.canonicalUrl } : undefined,
  }
}

export default async function BlogPostPage({ params }: BlogPageProps) {
  const blog = await getBlog(params.slug)

  if (!blog) {
    notFound()
  }

  const relatedBlogs = await getRelatedBlogs(blog.categoryId, blog.id)

  return (
    <div className="min-h-screen bg-white">
      {/* Article Header */}
      <article>
        <header className="bg-white">
          <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 pt-14 pb-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
              <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-gray-600 transition-colors">Blog</Link>
              <span>/</span>
              <Link
                href={`/blog?category=${blog.category?.slug}`}
                className="hover:text-gray-600 transition-colors"
              >
                {blog.category?.name}
              </Link>
            </nav>

            {/* Category & Meta */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold text-dark-blue bg-blue-50 px-3 py-1.5 rounded-full">
                {blog.category?.name}
              </span>
              <span className="text-sm text-gray-400">{blog.readTimeMinutes} min read</span>
              <span className="text-sm text-gray-400">·</span>
              <span className="text-sm text-gray-400">{blog.views} views</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-gray-900 leading-tight">
              {blog.title}
            </h1>

            {/* Excerpt */}
            {blog.excerpt && (
              <p className="mt-5 text-xl text-gray-500 leading-relaxed">
                {blog.excerpt}
              </p>
            )}

            {/* Author & Date */}
            <div className="mt-8 flex items-center gap-4 pb-8 border-b border-gray-100">
              <div className="h-12 w-12 rounded-full bg-dark-blue text-white flex items-center justify-center text-lg font-bold">
                {blog.author?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900">{blog.author?.name}</p>
                <p className="text-sm text-gray-400">
                  {new Date(blog.publishAt || blog.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Featured Image */}
        {blog.featuredImageUrl && (
          <div className="mx-auto max-w-[1000px] px-4 sm:px-6 lg:px-8 mb-10">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              <img
                src={blog.featuredImageUrl}
                alt={blog.featuredImageAlt || blog.title}
                className="w-full object-cover max-h-[500px]"
                loading="eager"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8 pb-16">
          {blog.contentJson ? (
            <BlogContentRenderer
              content={blog.contentJson}
              className="text-gray-700"
            />
          ) : (
            <SafeHtmlRenderer html={blog.contentHtml || blog.content} />
          )}

          {/* Tags */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-500 mr-2">Tags:</span>
                {blog.tags.map((tag: any) => (
                  <Link
                    key={tag.id}
                    href={`/blog?tag=${tag.slug}`}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-dark-blue transition-colors"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Related Posts */}
      {relatedBlogs.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-100">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-16">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8">Related Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {(relatedBlogs as any[]).map((post: any) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all"
                >
                  {post.featuredImageUrl ? (
                    <div className="aspect-[16/10] overflow-hidden">
                      <img
                        src={post.featuredImageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100" />
                  )}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-dark-blue bg-blue-50 px-2 py-0.5 rounded-full">
                        {post.category?.name}
                      </span>
                      <span className="text-[11px] text-gray-400">{post.readTimeMinutes} min</span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 group-hover:text-dark-blue transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-gray-500 line-clamp-2">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: blog.title,
            description: blog.metaDescription || blog.excerpt,
            image: blog.featuredImageUrl || undefined,
            author: {
              '@type': 'Person',
              name: blog.author?.name,
            },
            publisher: {
              '@type': 'Organization',
              name: 'MillionFlats',
            },
            datePublished: (blog.publishAt || blog.createdAt).toISOString(),
            dateModified: blog.updatedAt?.toISOString(),
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': `https://millionflats.com/blog/${blog.slug}`,
            },
          }),
        }}
      />
    </div>
  )
}

// Safe HTML fallback renderer (no dangerouslySetInnerHTML for content)
function SafeHtmlRenderer({ html }: { html: string }) {
  if (!html) return <p className="text-gray-400">No content available</p>

  const segments = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .filter((s) => s.trim())

  return (
    <div className="space-y-4">
      {segments.map((segment, i) => (
        <p key={i} className="text-gray-700 leading-relaxed text-lg">
          {segment.trim()}
        </p>
      ))}
    </div>
  )
}
