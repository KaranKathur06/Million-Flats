'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import SelectDropdown from '@/components/SelectDropdown'
import { SEOScore } from '@/components/admin/blogs/seo-score'
import { TiptapEditor } from '@/components/admin/blogs/tiptap-editor'
import { CloudinaryUpload } from '@/components/admin/blogs/cloudinary-upload'

const blogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().min(50, 'Excerpt must be at least 50 characters'),
  content: z.string().min(1, 'Content is required'),
  contentJson: z.any().optional(),
  featuredImageUrl: z.string().optional(),
  featuredImageAlt: z.string().optional(),
  targetKeyword: z.string().min(1, 'Target keyword is required'),
  metaTitle: z.string().min(1, 'Meta title is required'),
  metaDescription: z.string().min(50, 'Meta description must be at least 50 characters'),
  canonicalUrl: z.string().url().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']),
  publishAt: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional(),
})

type BlogFormData = z.infer<typeof blogSchema>

type PageProps = {
  params: { id: string }
}

type TagItem = { id: string; name: string }

export default function EditBlogPage({ params }: PageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<TagItem[]>([])
  const [seoScore, setSeoScore] = useState(0)
  const [readTime, setReadTime] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      status: 'DRAFT',
      tags: [],
      canonicalUrl: '',
      content: '',
      contentJson: null,
      featuredImageUrl: '',
      featuredImageAlt: '',
    },
  })

  const values = watch()

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [blogRes, categoriesRes, tagsRes] = await Promise.all([
          fetch(`/api/admin/blogs/${params.id}`),
          fetch('/api/admin/categories'),
          fetch('/api/admin/tags'),
        ])

        const [blogJson, categoriesJson, tagsJson] = await Promise.all([
          blogRes.json().catch(() => null),
          categoriesRes.json().catch(() => null),
          tagsRes.json().catch(() => null),
        ])

        if (!alive) return

        if (!blogRes.ok || !blogJson?.success || !blogJson?.data) {
          const msg = blogJson?.message || 'Blog not found'
          setErrorMessage(msg)
          setIsLoading(false)
          return
        }

        const blog = blogJson.data
        const normalizedStatus = ['DRAFT', 'PUBLISHED', 'SCHEDULED'].includes(String(blog.status || '').toUpperCase())
          ? String(blog.status).toUpperCase()
          : 'DRAFT'
        const tagNames = Array.isArray(blog.tags) ? blog.tags.map((t: any) => String(t?.tag?.name || t?.name || '')).filter(Boolean) : []

        reset({
          title: blog.title || '',
          excerpt: blog.excerpt || '',
          content: blog.contentHtml || blog.content || '',
          contentJson: blog.contentJson || null,
          featuredImageUrl: blog.featuredImageUrl || '',
          featuredImageAlt: blog.featuredImageAlt || '',
          targetKeyword: blog.targetKeyword || '',
          metaTitle: blog.metaTitle || '',
          metaDescription: blog.metaDescription || '',
          canonicalUrl: blog.canonicalUrl || '',
          status: normalizedStatus as BlogFormData['status'],
          publishAt: blog.publishAt ? new Date(blog.publishAt).toISOString().slice(0, 16) : '',
          categoryId: blog.categoryId || '',
          tags: tagNames,
        })

        setCategories(categoriesJson?.success ? categoriesJson.data || [] : [])
        setAvailableTags(tagsJson?.success ? tagsJson.data || [] : [])
      } catch (error) {
        console.error('Failed to load edit data', error)
        if (alive) setErrorMessage('Failed to load blog editor')
      } finally {
        if (alive) setIsLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [params.id, reset])

  const metrics = useMemo(() => {
    const plain = (values.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const words = plain ? plain.split(/\s+/).filter(Boolean).length : 0
    const read = Math.max(1, Math.ceil(words / 200))
    const score = calculateSEOScore(
      values.title || '',
      values.metaDescription || '',
      plain,
      values.targetKeyword || '',
      !!values.featuredImageUrl,
      values.featuredImageAlt,
      countInternalLinks(values.content || ''),
      values.excerpt || ''
    )
    return { plain, read, score }
  }, [
    values.title,
    values.metaDescription,
    values.content,
    values.targetKeyword,
    values.featuredImageUrl,
    values.featuredImageAlt,
    values.excerpt,
  ])

  useEffect(() => {
    setSeoScore(metrics.score)
    setReadTime(metrics.read)
  }, [metrics])

  const onSubmit = async (data: BlogFormData) => {
    setIsSaving(true)
    setErrorMessage('')
    try {
      const payload = {
        ...data,
        contentHtml: data.content,
        contentJson: data.contentJson || null,
      }

      const res = await fetch(`/api/admin/blogs/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to update blog')
      }

      router.push('/admin/blogs/all')
      router.refresh()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update blog')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="py-12 text-sm text-white/60">Loading blog editor...</div>
  }

  if (errorMessage && !values.title) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-300">{errorMessage}</p>
        <button
          onClick={() => router.push('/admin/blogs/all')}
          className="inline-flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
        >
          Back to blogs
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Edit Blog</h1>
          <p className="mt-1 text-sm text-white/50">Update content, SEO metadata, and featured media.</p>
        </div>
        <button
          onClick={() => router.push('/admin/blogs/all')}
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all duration-200"
        >
          Cancel
        </button>
      </div>

      {errorMessage ? <p className="text-sm text-red-300">{errorMessage}</p> : null}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Blog Title</label>
            <input
              {...register('title')}
              className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white"
              placeholder="Enter your blog title..."
            />
            {errors.title && <p className="text-red-400 text-sm mt-2">{errors.title.message}</p>}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Content</label>
            <TiptapEditor
              content={values.content || ''}
              onChange={(html, json) => {
                setValue('content', html)
                setValue('contentJson', json)
              }}
            />
            {errors.content && <p className="text-red-400 text-sm mt-2">{errors.content.message}</p>}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Excerpt</label>
            <textarea
              {...register('excerpt')}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white resize-none"
              placeholder="Brief description..."
            />
            {errors.excerpt && <p className="text-red-400 text-sm mt-2">{errors.excerpt.message}</p>}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-3">Featured Image</label>
            <CloudinaryUpload
              titleOrSlug={values.title || ''}
              initialUrl={values.featuredImageUrl || ''}
              initialAlt={values.featuredImageAlt || ''}
              onUpload={(url, alt) => {
                setValue('featuredImageUrl', url)
                setValue('featuredImageAlt', alt)
              }}
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <SEOScore score={seoScore} />
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Category</label>
            <SelectDropdown
              label="Category"
              showLabel={false}
              value={values.categoryId || ''}
              onChange={(v) => setValue('categoryId', v, { shouldValidate: true })}
              options={[
                { value: '', label: 'Select a category...' },
                ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
              ]}
            />
            {errors.categoryId && <p className="text-red-400 text-sm mt-2">{errors.categoryId.message}</p>}
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">SEO Settings</h3>
            <input {...register('targetKeyword')} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white" placeholder="Target keyword" />
            <input {...register('metaTitle')} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white" placeholder="Meta title" />
            <textarea {...register('metaDescription')} rows={3} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white resize-none" placeholder="Meta description" />
            <input {...register('canonicalUrl')} className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white" placeholder="Canonical URL" />
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">Publishing</h3>
            <SelectDropdown
              label="Status"
              showLabel={false}
              value={values.status || 'DRAFT'}
              onChange={(v) => setValue('status', v as BlogFormData['status'])}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'PUBLISHED', label: 'Publish Now' },
                { value: 'SCHEDULED', label: 'Schedule' },
              ]}
            />
            {values.status === 'SCHEDULED' ? (
              <input
                {...register('publishAt')}
                type="datetime-local"
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white"
              />
            ) : null}
            <div className="text-sm text-white/40">Estimated Read Time: <span className="text-white/70 font-semibold">{readTime} min</span></div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

function countInternalLinks(content: string): number {
  const hrefRegex = /href=["'](\/?[^"']*?)["']/gi
  let count = 0
  let match
  while ((match = hrefRegex.exec(content)) !== null) {
    const url = match[1]
    if (url.startsWith('/') && !url.startsWith('//') && !url.includes('http')) count++
  }
  return count
}

function calculateSEOScore(
  title: string,
  metaDescription: string,
  plainContent: string,
  targetKeyword: string,
  hasFeaturedImage: boolean,
  featuredImageAlt: string | undefined,
  internalLinks: number,
  excerpt: string
): number {
  if (!targetKeyword) return 0
  let score = 0
  const kw = targetKeyword.toLowerCase()

  if (title.toLowerCase().includes(kw)) score += 15
  if (metaDescription.toLowerCase().includes(kw)) score += 15
  if (plainContent.substring(0, 200).toLowerCase().includes(kw)) score += 10
  if (title.length >= 30 && title.length <= 70) score += 10
  if (metaDescription.length >= 120 && metaDescription.length <= 200) score += 10
  if (plainContent.split(/\s+/).filter(Boolean).length >= 800) score += 10
  if (hasFeaturedImage) score += 10
  if (featuredImageAlt && featuredImageAlt.trim().length > 0) score += 5
  if (internalLinks >= 2) score += 10
  if (excerpt && excerpt.trim().length >= 50) score += 5

  return score
}
