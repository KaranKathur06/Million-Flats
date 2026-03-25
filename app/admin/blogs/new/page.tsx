'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { SEOScore } from '@/components/admin/blogs/seo-score'
import { TiptapEditor } from '@/components/admin/blogs/tiptap-editor'
import { CloudinaryUpload } from '@/components/admin/blogs/cloudinary-upload'
import SelectDropdown from '@/components/SelectDropdown'

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

interface TagItem {
  id: string
  name: string
  slug: string
  _count?: { blogs: number }
}

export default function CreateBlogPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<TagItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [seoScore, setSeoScore] = useState(0)
  const [readTime, setReadTime] = useState(0)
  const [tagInput, setTagInput] = useState('')
  const [tagSuggestions, setTagSuggestions] = useState<TagItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimerRef = useRef<NodeJS.Timeout>()
  const tagInputRef = useRef<HTMLInputElement>(null)

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
      content: '',
      contentJson: null,
    },
  })

  const watchedValues = watch()

  // Fetch categories and tags
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesRes, tagsRes] = await Promise.all([
          fetch('/api/admin/categories').then((r) => r.json()).catch(() => null),
          fetch('/api/admin/tags').then((r) => r.json()).catch(() => null),
        ])

        setCategories(categoriesRes?.success ? categoriesRes.data || [] : [])
        setAvailableTags(tagsRes?.success ? tagsRes.data || [] : [])
      } catch (error) {
        console.error('Failed to fetch data:', error)
      }
    }

    fetchData()
  }, [])

  // SEO score calculation
  useEffect(() => {
    if (watchedValues.content) {
      const plainText = watchedValues.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      const score = calculateSEOScore(
        watchedValues.title || '',
        watchedValues.metaDescription || '',
        plainText,
        watchedValues.targetKeyword || '',
        !!watchedValues.featuredImageUrl,
        watchedValues.featuredImageAlt,
        extractInternalLinks(watchedValues.content),
        watchedValues.excerpt || ''
      )
      setSeoScore(score)

      const wordCount = plainText.split(/\s+/).filter(Boolean).length
      setReadTime(Math.ceil(wordCount / 200))
    }
  }, [
    watchedValues.title,
    watchedValues.content,
    watchedValues.metaDescription,
    watchedValues.targetKeyword,
    watchedValues.featuredImageUrl,
    watchedValues.featuredImageAlt,
    watchedValues.excerpt,
  ])

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (watchedValues.title && watchedValues.content) {
      autoSaveTimerRef.current = setInterval(() => {
        setSaveStatus('saving')
        try {
          localStorage.setItem(
            'blog_draft',
            JSON.stringify({
              ...watchedValues,
              savedAt: new Date().toISOString(),
            })
          )
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        } catch {
          setSaveStatus('idle')
        }
      }, 30000)
    }

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current)
    }
  }, [watchedValues.title, watchedValues.content])

  // Tag autocomplete
  const handleTagInputChange = useCallback(
    (value: string) => {
      setTagInput(value)
      if (value.trim().length > 0) {
        const filtered = availableTags.filter(
          (t) =>
            t.name.toLowerCase().includes(value.toLowerCase()) &&
            !(watchedValues.tags || []).includes(t.name)
        )
        setTagSuggestions(filtered.slice(0, 8))
        setShowSuggestions(filtered.length > 0)
      } else {
        setShowSuggestions(false)
        setTagSuggestions([])
      }
    },
    [availableTags, watchedValues.tags]
  )

  const addTag = useCallback(
    (tagName: string) => {
      const name = tagName.trim()
      if (!name) return
      const currentTags = watchedValues.tags || []
      if (!currentTags.includes(name)) {
        setValue('tags', [...currentTags, name])
      }
      // Add to available tags if it's new
      if (!availableTags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
        setAvailableTags((prev) => [
          ...prev,
          { id: `new-${Date.now()}`, name, slug: name.toLowerCase().replace(/\s+/g, '-') },
        ])
      }
      setTagInput('')
      setShowSuggestions(false)
    },
    [watchedValues.tags, availableTags, setValue]
  )

  const removeTag = useCallback(
    (tagName: string) => {
      const currentTags = watchedValues.tags || []
      setValue('tags', currentTags.filter((t) => t !== tagName))
    },
    [watchedValues.tags, setValue]
  )

  // Content change handler — receives both HTML and JSON from editor
  const handleContentChange = useCallback(
    (html: string, json: any) => {
      setValue('content', html)
      setValue('contentJson', json)
    },
    [setValue]
  )

  const onSubmit = async (data: BlogFormData) => {
    setIsSubmitting(true)
    try {
      const payload = {
        ...data,
        contentHtml: data.content,
        contentJson: data.contentJson || null,
      }

      const response = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create blog')
      }

      // Clear draft
      localStorage.removeItem('blog_draft')

      router.push('/admin/blogs/all')
    } catch (error) {
      console.error('Error creating blog:', error)
      alert(error instanceof Error ? error.message : 'Failed to create blog')
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateSEOScore = (
    title: string,
    metaDescription: string,
    plainContent: string,
    targetKeyword: string,
    hasFeaturedImage: boolean,
    featuredImageAlt: string | undefined,
    internalLinks: number,
    excerpt: string
  ): number => {
    if (!targetKeyword) return 0
    let score = 0
    const kw = targetKeyword.toLowerCase()

    if (title.toLowerCase().includes(kw)) score += 15
    if (metaDescription.toLowerCase().includes(kw)) score += 15

    const firstChunk = plainContent.substring(0, 200).toLowerCase()
    if (firstChunk.includes(kw)) score += 10

    if (title.length >= 30 && title.length <= 70) score += 10
    if (metaDescription.length >= 120 && metaDescription.length <= 200) score += 10
    if (plainContent.split(/\s+/).filter(Boolean).length >= 800) score += 10
    if (hasFeaturedImage) score += 10
    if (featuredImageAlt && featuredImageAlt.trim().length > 0) score += 5
    if (internalLinks >= 2) score += 10
    if (excerpt && excerpt.trim().length >= 50) score += 5

    return score
  }

  const extractInternalLinks = (content: string): number => {
    const hrefRegex = /href=["'](\/?[^"']*?)["']/gi
    let count = 0
    let match
    while ((match = hrefRegex.exec(content)) !== null) {
      const url = match[1]
      if (url.startsWith('/') && !url.startsWith('//') && !url.includes('http')) count++
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
            {saveStatus === 'saving' && (
              <span className="inline-flex h-6 items-center rounded-md bg-blue-400/10 px-2 text-[11px] font-medium text-blue-400 animate-pulse">
                Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex h-6 items-center rounded-md bg-emerald-400/10 px-2 text-[11px] font-medium text-emerald-400">
                ✓ Draft saved
              </span>
            )}
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
              onChange={handleContentChange}
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
            <SelectDropdown
              label="Category"
              showLabel={false}
              value={watchedValues.categoryId || ''}
              onChange={(v) => setValue('categoryId', v, { shouldValidate: true })}
              options={[
                { value: '', label: 'Select a category...' },
                ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
              ]}
            />
            {errors.categoryId && (
              <p className="text-red-400 text-sm mt-2">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Tags — with autocomplete and proper add/remove */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <label className="block text-sm font-semibold text-white/80 mb-3">Tags</label>

            {/* Selected tags */}
            {(watchedValues.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {(watchedValues.tags || []).map((tagName) => (
                  <span
                    key={tagName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400/15 text-amber-300 text-xs font-semibold border border-amber-400/25"
                  >
                    {tagName}
                    <button
                      type="button"
                      onClick={() => removeTag(tagName)}
                      className="h-4 w-4 rounded-full flex items-center justify-center hover:bg-amber-400/30 transition-colors"
                      aria-label={`Remove tag ${tagName}`}
                    >
                      <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input with autocomplete */}
            <div className="relative">
              <div className="flex gap-2">
                <input
                  ref={tagInputRef}
                  type="text"
                  value={tagInput}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (tagInput.trim()) {
                        addTag(tagInput)
                      }
                    }
                    if (e.key === 'Escape') {
                      setShowSuggestions(false)
                    }
                  }}
                  onFocus={() => {
                    if (tagInput.trim()) handleTagInputChange(tagInput)
                  }}
                  onBlur={() => {
                    // Delay to allow click on suggestion
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  placeholder="Type to add tag..."
                  className="flex-1 px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tagInput.trim()) addTag(tagInput)
                  }}
                  className="px-3 py-2 rounded-lg border border-amber-400/30 bg-amber-400/10 text-amber-300 text-xs font-semibold hover:bg-amber-400/20 transition-all duration-200"
                >
                  Add
                </button>
              </div>

              {/* Autocomplete dropdown */}
              {showSuggestions && tagSuggestions.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-white/[0.08] bg-[#0f1825] shadow-xl overflow-hidden">
                  {tagSuggestions.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault()
                        addTag(tag.name)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:bg-white/[0.06] hover:text-white transition-colors flex items-center justify-between"
                    >
                      <span>{tag.name}</span>
                      {tag._count?.blogs !== undefined && (
                        <span className="text-xs text-white/30">{tag._count.blogs} blogs</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle available tags */}
            {availableTags.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.06]">
                <p className="text-xs text-white/30 mb-2">Click to toggle:</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableTags.slice(0, 20).map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => {
                        const currentTags = watchedValues.tags || []
                        if (currentTags.includes(tag.name)) {
                          removeTag(tag.name)
                        } else {
                          addTag(tag.name)
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 border ${
                        (watchedValues.tags || []).includes(tag.name)
                          ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                          : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
                      }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {availableTags.length === 0 && !(watchedValues.tags || []).length && (
              <p className="text-white/30 text-xs mt-2">Type a tag name above and press Enter to create</p>
            )}
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
              <p className="text-xs text-white/30 mt-1">{(watchedValues.metaTitle || '').length}/70 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/60 mb-1.5">Meta Description</label>
              <textarea
                {...register('metaDescription')}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200 resize-none"
                placeholder="SEO description..."
              />
              <p className="text-xs text-white/30 mt-1">{(watchedValues.metaDescription || '').length}/200 characters</p>
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
              <SelectDropdown
                label="Status"
                showLabel={false}
                value={watchedValues.status || 'DRAFT'}
                onChange={(v) => setValue('status', v as any)}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PUBLISHED', label: 'Publish Now' },
                  { value: 'SCHEDULED', label: 'Schedule' },
                ]}
              />
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