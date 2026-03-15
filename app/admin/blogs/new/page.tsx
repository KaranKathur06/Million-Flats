'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { SEOScore } from '@/components/admin/blogs/seo-score'
import { TiptapEditor } from '@/components/admin/blogs/tiptap-editor'
import { CloudinaryUpload } from '@/components/admin/blogs/cloudinary-upload'

const blogSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  excerpt: z.string().min(50, 'Excerpt must be at least 50 characters'),
  content: z.string().min(1, 'Content is required'),
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

export default function CreateBlogPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [seoScore, setSeoScore] = useState(0)
  const [readTime, setReadTime] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BlogFormData>({
    resolver: zodResolver(blogSchema),
    defaultValues: {
      status: 'DRAFT',
      tags: [],
      canonicalUrl: '',
    },
  })

  const watchedValues = watch()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          fetch('/api/admin/categories').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/tags').then((r) => r.json()).catch(() => null),
        ])

        setCategories(categoriesRes?.data || [])
        setTags(tagsRes?.data || [])
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    if (watchedValues.content) {
      const score = calculateSEOScore(
        watchedValues.title || '',
        watchedValues.metaDescription || '',
        watchedValues.content,
        watchedValues.targetKeyword || '',
        !!watchedValues.featuredImageUrl,
        watchedValues.featuredImageAlt,
        extractInternalLinks(watchedValues.content),
        watchedValues.excerpt || ''
      )
      setSeoScore(score)

      const wordCount = watchedValues.content.trim().split(/\s+/).filter(Boolean).length
      setReadTime(Math.ceil(wordCount / 200))
    }
  }, [watchedValues])

  const onSubmit = async (data: BlogFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create blog')
      }

      router.push('/admin/blogs')
    } catch (error) {
      console.error('Error creating blog:', error)
      alert('Failed to create blog')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateSEOScore = (
    title: string,
    metaDescription: string,
    content: string,
    targetKeyword: string,
    hasFeaturedImage: boolean,
    featuredImageAlt: string | undefined,
    internalLinks: number,
    excerpt: string
  ): number => {
    let score = 0

    if (title.toLowerCase().includes(targetKeyword.toLowerCase())) score += 15
    if (metaDescription.toLowerCase().includes(targetKeyword.toLowerCase())) score += 15

    const firstParagraph = content.split('\n')[0] || content
    if (firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase())) score += 10

    if (title.length >= 30 && title.length <= 70) score += 10
    if (metaDescription.length >= 120 && metaDescription.length <= 200) score += 10

    if (
      content.trim().split(/\s+/).filter(Boolean).length >= 800
    ) score += 10

    if (hasFeaturedImage) score += 10
    if (featuredImageAlt && featuredImageAlt.trim().length > 0) score += 5
    if (internalLinks >= 2) score += 10
    if (excerpt && excerpt.trim().length >= 50) score += 5

    return score
  }

  const extractInternalLinks = (content: string): number => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let count = 0
    let match
    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[2]
      if (url.startsWith('/') && !url.includes('http')) count++
    }
    return count
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Blog
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Create New Blog</h1>
          <p className="mt-1 text-sm text-white/50">Write and publish content to engage your audience</p>
        </div>
        <button
          onClick={() => router.back()}
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all duration-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Blog Title</label>
            <input
              {...register('title')}
              className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
              placeholder="Enter your blog title..."
            />
            {errors.title && <p className="text-red-400 text-sm mt-2">{errors.title.message}</p>}
          </div>

          {/* Content */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Content</label>
            <TiptapEditor
              content={watchedValues.content || ''}
              onChange={(value) => setValue('content', value)}
            />
            {errors.content && <p className="text-red-400 text-sm mt-2">{errors.content.message}</p>}
          </div>

          {/* Excerpt */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Excerpt</label>
            <textarea
              {...register('excerpt')}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 resize-none"
              placeholder="Brief description of your blog (50+ characters)..."
            />
            {errors.excerpt && <p className="text-red-400 text-sm mt-2">{errors.excerpt.message}</p>}
          </div>

          {/* Featured Image */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-3">Featured Image</label>
            <CloudinaryUpload
              onUpload={(url, alt) => {
                setValue('featuredImageUrl', url)
                setValue('featuredImageAlt', alt)
              }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Score */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <SEOScore score={seoScore} />
          </div>

          {/* Category */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-2">Category</label>
            <select
              {...register('categoryId')}
              className="w-full px-4 py-3 rounded-xl border border-white/[0.08] bg-[#0d1526] text-white/80 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 appearance-none cursor-pointer"
            >
              <option value="">Select a category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="text-red-400 text-sm mt-2">{errors.categoryId.message}</p>}
          </div>

          {/* Tags */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-3">Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    const currentTags = watchedValues.tags || []
                    if (currentTags.includes(tag.name)) {
                      setValue('tags', currentTags.filter((t) => t !== tag.name))
                    } else {
                      setValue('tags', [...currentTags, tag.name])
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                    watchedValues.tags?.includes(tag.name)
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                      : 'bg-white/[0.04] text-white/50 border-white/[0.08] hover:bg-white/[0.08] hover:text-white/70'
                  }`}
                >
                  {tag.name}
                </button>
              ))}
              {tags.length === 0 && (
                <p className="text-white/30 text-xs">No tags available</p>
              )}
            </div>
          </div>

          {/* SEO Fields */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              SEO Settings
            </h3>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Target Keyword</label>
              <input
                {...register('targetKeyword')}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
                placeholder="Primary keyword..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Meta Title</label>
              <input
                {...register('metaTitle')}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
                placeholder="SEO title..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Meta Description</label>
              <textarea
                {...register('metaDescription')}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 resize-none"
                placeholder="SEO description..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Canonical URL</label>
              <input
                {...register('canonicalUrl')}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Publish Settings */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Publishing
            </h3>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Status</label>
              <select
                {...register('status')}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-[#0d1526] text-white/80 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Publish Now</option>
                <option value="SCHEDULED">Schedule</option>
              </select>
            </div>

            {watchedValues.status === 'SCHEDULED' && (
              <div>
                <label className="block text-sm font-medium text-white/60 mb-1.5">Publish Date</label>
                <input
                  {...register('publishAt')}
                  type="datetime-local"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
                />
              </div>
            )}

            <div className="pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-2 text-sm text-white/40">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Estimated Read Time: <span className="text-white/70 font-semibold">{readTime} min</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold transition-all duration-300 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Blog
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}