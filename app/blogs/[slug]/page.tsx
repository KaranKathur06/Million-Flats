import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import BlogViewTracker from './BlogViewTracker'

export const revalidate = 60

type BlogPageProps = {
  params: { slug: string }
}

async function getPublishedBlogBySlug(slug: string) {
  const now = new Date()
  const blog = await (prisma as any).blog.findUnique({
    where: { slug },
    include: {
      category: true,
      author: true,
    },
  })

  if (!blog) return null
  if (blog.status !== 'PUBLISHED') return null
  if (blog.publishAt && new Date(blog.publishAt) > now) return null
  return blog
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const blog = await getPublishedBlogBySlug(params.slug)

  if (!blog) {
    return { title: 'Blog Not Found | MillionFlats' }
  }

  return {
    title: blog.metaTitle || blog.title,
    description: blog.metaDescription || blog.excerpt || 'Read this MillionFlats article.',
    alternates: blog.canonicalUrl ? { canonical: blog.canonicalUrl } : undefined,
    openGraph: {
      title: blog.metaTitle || blog.title,
      description: blog.metaDescription || blog.excerpt || '',
      type: 'article',
      images: blog.featuredImageUrl ? [{ url: blog.featuredImageUrl }] : undefined,
    },
  }
}

export default async function BlogSlugPage({ params }: BlogPageProps) {
  const blog = await getPublishedBlogBySlug(params.slug)

  if (!blog) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white py-8 sm:py-10">
      <BlogViewTracker slug={params.slug} />

      <article className="mx-auto w-full max-w-[900px] px-4 sm:px-6 lg:px-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-dark-blue">
            Home
          </Link>
          <span>/</span>
          <Link href="/blogs" className="hover:text-dark-blue">
            Blogs
          </Link>
          <span>/</span>
          <span className="line-clamp-1 text-gray-600">{blog.title}</span>
        </nav>

        <header className="mb-8 border-b border-gray-100 pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-primary-50 px-2.5 py-1 font-semibold text-primary-700">
              {blog.category?.name || 'General'}
            </span>
            <span className="text-gray-500">{blog.readTimeMinutes || 1} min read</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{blog.title}</h1>
          {blog.excerpt ? <p className="mt-4 text-base text-gray-600">{blog.excerpt}</p> : null}

          <div className="mt-4 text-sm text-gray-500">
            By {blog.author?.name || 'MillionFlats'} ·{' '}
            {new Date(blog.publishAt || blog.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        </header>

        {blog.featuredImageUrl ? (
          <div className="relative mb-8 aspect-[16/9] overflow-hidden rounded-2xl border border-gray-200">
            <Image
              src={blog.featuredImageUrl}
              alt={blog.featuredImageAlt || blog.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 900px"
            />
          </div>
        ) : null}

        <section className="prose prose-gray max-w-none">
          <div dangerouslySetInnerHTML={{ __html: blog.contentHtml || blog.content || '' }} />
        </section>
      </article>
    </main>
  )
}
