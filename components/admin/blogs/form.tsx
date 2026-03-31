import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SEOScore } from '@/components/admin/blogs/seo-score'
import { TiptapEditor } from '@/components/admin/blogs/tiptap-editor'
import { CloudinaryUpload } from '@/components/admin/blogs/cloudinary-upload'
import SelectDropdown from '@/components/SelectDropdown'

interface BlogFormProps {
  user?: any
}

export const BlogForm: React.FC<BlogFormProps> = ({ user }) => {
  const [blog, setBlog] = useState({
    title: '',
    excerpt: '',
    content: '',
    contentJson: null as any,
    featuredImageUrl: '',
    featuredImageAlt: '',
    targetKeyword: '',
    metaTitle: '',
    metaDescription: '',
    canonicalUrl: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'SCHEDULED',
    publishAt: '',
    categoryId: '',
    tags: [] as string[],
  })

  const [isSaving, setIsSaving] = useState(false)
  const [seoScore, setSEOScore] = useState(0)
  const [readTime, setReadTime] = useState(0)
  const [categories, setCategories] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const router = useRouter()
  const autoSaveRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!user) return

    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((res) => setCategories(res?.data || []))
      .catch(() => setCategories([]))

    fetch('/api/admin/tags')
      .then((r) => r.json())
      .then((res) => setAvailableTags(res?.data || []))
      .catch(() => setAvailableTags([]))

    autoSaveRef.current = setInterval(() => {
      handleAutoSave()
    }, 60000)

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [user])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setBlog(prev => ({ ...prev, [name]: value }))
    updateSEOScore()
  }

  const handleContentChange = useCallback((html: string, json: any) => {
    setBlog(prev => ({ ...prev, content: html, contentJson: json }))
    updateSEOScore()
  }, [])

  const handleSEOChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setBlog(prev => ({ ...prev, [name]: value }))
    updateSEOScore()
  }

  const updateSEOScore = () => {
    const plainText = blog.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    const score = calculateSEOScore(
      blog.title,
      blog.metaDescription,
      plainText,
      blog.targetKeyword,
      !!blog.featuredImageUrl,
      blog.featuredImageAlt,
      countInternalLinks(blog.content),
      blog.excerpt
    )
    setSEOScore(score)
    setReadTime(Math.ceil(plainText.split(/\s+/).filter(Boolean).length / 200))
  }

  const handleAutoSave = () => {
    if (blog.title && blog.content) {
      console.log('Auto-saving blog draft...')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSaving) return
    setIsSaving(true)

    try {
      const response = await fetch('/api/admin/blogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...blog,
          contentHtml: blog.content,
        }),
      })

      const json = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(json?.message || 'Failed to create blog')
      }

      const id = json?.data?.id
      if (id) {
        router.push(`/admin/blogs/${id}/edit`)
      } else {
        router.push('/admin/blogs')
      }
    } catch (error) {
      setIsSaving(false)
      console.error('Failed to create blog:', error)
    }
  }

  const calculateSEOScore = (
    title: string,
    metaDescription: string,
    content: string,
    targetKeyword: string,
    hasFeaturedImage: boolean,
    featuredImageAlt: string | null | undefined,
    internalLinks: number,
    excerpt: string
  ): number => {
    if (!targetKeyword) return 0
    let score = 0
    const kw = targetKeyword.toLowerCase()

    if (title.toLowerCase().includes(kw)) score += 15
    if (metaDescription.toLowerCase().includes(kw)) score += 15
    const firstParagraph = content.substring(0, 200).toLowerCase()
    if (firstParagraph.includes(kw)) score += 10
    if (title.length >= 30 && title.length <= 70) score += 10
    if (metaDescription.length >= 120 && metaDescription.length <= 200) score += 10
    if (content.split(/\s+/).filter(Boolean).length >= 800) score += 10
    if (hasFeaturedImage) score += 10
    if (featuredImageAlt && featuredImageAlt.trim().length > 0) score += 5
    if (internalLinks >= 2) score += 10
    if (excerpt && excerpt.trim().length >= 50) score += 5

    return score
  }

  const countInternalLinks = (content: string): number => {
    const hrefRegex = /href=["'](\/?[^"']*?)["']/gi
    let count = 0
    let match
    while ((match = hrefRegex.exec(content)) !== null) {
      const url = match[1]
      if (url.startsWith('/') && !url.startsWith('//')) count++
    }
    return count
  }

  const removeTag = (tagName: string) => {
    setBlog(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagName),
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-white/70 mb-2">
              Blog Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={blog.title}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all duration-200"
              placeholder="Enter your blog title..."
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-white/70 mb-2">
              Content *
            </label>
            <TiptapEditor
              content={blog.content}
              onChange={handleContentChange}
            />
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-white/70 mb-2">
              Excerpt *
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={blog.excerpt}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all duration-200 resize-none"
              placeholder="Enter a brief excerpt (50+ characters)..."
              rows={3}
              maxLength={300}
            />
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Featured Image
            </label>
            <CloudinaryUpload
              onUpload={(url, alt) => {
                setBlog(prev => ({ ...prev, featuredImageUrl: url, featuredImageAlt: alt }))
                updateSEOScore()
              }}
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* SEO Score */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <SEOScore score={seoScore} />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-white/70 mb-2">
              Category *
            </label>
            <SelectDropdown
              name="categoryId"
              label="Category"
              value={blog.categoryId}
              onChange={(value) => setBlog((prev) => ({ ...prev, categoryId: value }))}
              options={[
                { value: '', label: 'Select a category...' },
                ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
              ]}
              variant="dark"
              showLabel={false}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Tags
            </label>

            {/* Selected tags with remove buttons */}
            {blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {blog.tags.map(tagName => (
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

            {/* Available tags */}
            <div className="flex flex-wrap gap-1">
              {availableTags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 border ${
                    blog.tags.includes(tag.name)
                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                      : 'bg-white/[0.03] text-white/40 border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60'
                  }`}
                  onClick={() => {
                    if (blog.tags.includes(tag.name)) {
                      removeTag(tag.name)
                    } else {
                      setBlog(prev => ({ ...prev, tags: [...prev.tags, tag.name] }))
                    }
                    updateSEOScore()
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>

          {/* SEO Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="targetKeyword" className="block text-sm font-medium text-white/70 mb-2">
                Target Keyword *
              </label>
              <input
                type="text"
                id="targetKeyword"
                name="targetKeyword"
                value={blog.targetKeyword}
                onChange={handleSEOChange}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all duration-200"
                placeholder="Enter your target keyword..."
              />
            </div>

            <div>
              <label htmlFor="metaTitle" className="block text-sm font-medium text-white/70 mb-2">
                Meta Title *
              </label>
              <input
                type="text"
                id="metaTitle"
                name="metaTitle"
                value={blog.metaTitle}
                onChange={handleSEOChange}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all duration-200"
                placeholder="Enter meta title..."
              />
            </div>

            <div>
              <label htmlFor="metaDescription" className="block text-sm font-medium text-white/70 mb-2">
                Meta Description *
              </label>
              <textarea
                id="metaDescription"
                name="metaDescription"
                value={blog.metaDescription}
                onChange={handleSEOChange}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all duration-200 resize-none"
                placeholder="Enter meta description..."
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="canonicalUrl" className="block text-sm font-medium text-white/70 mb-2">
                Canonical URL
              </label>
              <input
                type="text"
                id="canonicalUrl"
                name="canonicalUrl"
                value={blog.canonicalUrl}
                onChange={handleSEOChange}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all duration-200"
                placeholder="Enter canonical URL..."
              />
            </div>
          </div>

          {/* Publish Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Status</label>
              <SelectDropdown
                name="status"
                label="Status"
                value={blog.status}
                onChange={(value) => setBlog((prev) => ({ ...prev, status: value as 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' }))}
                options={[
                  { value: 'DRAFT', label: 'Draft' },
                  { value: 'PUBLISHED', label: 'Publish Now' },
                  { value: 'SCHEDULED', label: 'Schedule' },
                ]}
                variant="dark"
                showLabel={false}
              />
            </div>

            {blog.status === 'SCHEDULED' && (
              <div>
                <label htmlFor="publishAt" className="block text-sm font-medium text-white/70 mb-2">
                  Publish Date
                </label>
                <input
                  type="datetime-local"
                  id="publishAt"
                  name="publishAt"
                  value={blog.publishAt}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white focus:outline-none focus:border-amber-400/40 transition-all duration-200"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">Author</label>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-[#0b1220] font-bold">
                    {user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-white/90">{user?.name}</p>
                    <p className="text-sm text-white/40">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <div className="text-sm text-white/40">
                Estimated Read Time: <span className="text-white/70 font-semibold">{readTime} minutes</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving || !blog.title || !blog.content}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold transition-all duration-300 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Creating...' : 'Create Blog'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}
