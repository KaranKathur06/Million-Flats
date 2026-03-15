'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import AdminLayout from '@/components/admin/layout'
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
    <AdminLayout title="Create Blog">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Create New Blog</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Blog Title</label>
              <input
                {...register('title')}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Enter your blog title..."
              />
              {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <TiptapEditor
                content={watchedValues.content || ''}
                onChange={(value) => setValue('content', value)}
              />
              {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content.message}</p>}
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium mb-2">Excerpt</label>
              <textarea
                {...register('excerpt')}
                rows={3}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Brief description of your blog (50+ characters)..."
              />
              {errors.excerpt && <p className="text-red-500 text-sm mt-1">{errors.excerpt.message}</p>}
            </div>

            {/* Featured Image */}
            <div>
              <label className="block text-sm font-medium mb-2">Featured Image</label>
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
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">SEO Score</h3>
              <SEOScore score={seoScore} />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                {...register('categoryId')}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">Select a category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.categoryId && <p className="text-red-500 text-sm mt-1">{errors.categoryId.message}</p>}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-2">Tags</label>
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
                    className={`px-3 py-1 rounded-full text-xs ${
                      watchedValues.tags?.includes(tag.name)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* SEO Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Target Keyword</label>
                <input
                  {...register('targetKeyword')}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Primary keyword..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Meta Title</label>
                <input
                  {...register('metaTitle')}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="SEO title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Meta Description</label>
                <textarea
                  {...register('metaDescription')}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="SEO description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Canonical URL</label>
                <input
                  {...register('canonicalUrl')}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Publish Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Publish Now</option>
                  <option value="SCHEDULED">Schedule</option>
                </select>
              </div>

              {watchedValues.status === 'SCHEDULED' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Publish Date</label>
                  <input
                    {...register('publishAt')}
                    type="datetime-local"
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="text-sm text-gray-500">
                  Estimated Read Time: {readTime} minutes
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="space-y-2 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-500 text-white py-2 rounded-md disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Blog'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  )
}