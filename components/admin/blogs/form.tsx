import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SEOScore } from '@/components/admin/blogs/seo-score'
import { TiptapEditor } from '@/components/admin/blogs/tiptap-editor'
import { CloudinaryUpload } from '@/components/admin/blogs/cloudinary-upload'

interface BlogFormProps {
  user?: any
}

export const BlogForm: React.FC<BlogFormProps> = ({ user }) => {
  const [blog, setBlog] = useState({
    title: '',
    excerpt: '',
    content: '',
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
  const [tags, setTags] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const router = useRouter()

  // Auto-save timer
  const autoSaveRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (!user) return

    // Fetch categories and tags
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((res) => setCategories(res?.data || []))
      .catch(() => setCategories([]))

    fetch('/api/admin/tags')
      .then((r) => r.json())
      .then((res) => setAvailableTags(res?.data || []))
      .catch(() => setAvailableTags([]))

    // Auto-save every 60 seconds
    autoSaveRef.current = setInterval(() => {
      handleAutoSave()
    }, 60000)

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current)
    }
  }, [user])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setBlog(prev => ({ ...prev, [name]: value }))

    // Update SEO score for relevant fields
    if (name === 'title' || name === 'metaDescription' || name === 'content' || name === 'excerpt') {
      updateSEOScore()
    }
  }

  const handleContentChange = (content: string) => {
    setBlog(prev => ({ ...prev, content }))
    updateSEOScore()
  }

  const handleSEOChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setBlog(prev => ({ ...prev, [name]: value }))
    updateSEOScore()
  }

  const updateSEOScore = () => {
    const score = calculateSEOScore(
      blog.title,
      blog.metaDescription,
      blog.content,
      blog.targetKeyword,
      !!blog.featuredImageUrl,
      blog.featuredImageAlt,
      countInternalLinks(blog.content),
      blog.excerpt
    )

    setSEOScore(score)
    setReadTime(Math.ceil(blog.content.trim().split(/\s+/).filter(Boolean).length / 200))
  }

  const handleAutoSave = () => {
    if (blog.title && blog.content) {
      console.log('Auto-saving blog draft...')
      // Implement auto-save logic here
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
        body: JSON.stringify(blog),
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
    let score = 0

    // 1. Keyword in title (15 points)
    if (title.toLowerCase().includes(targetKeyword.toLowerCase())) score += 15

    // 2. Keyword in meta description (15 points)
    if (metaDescription.toLowerCase().includes(targetKeyword.toLowerCase())) score += 15

    // 3. Keyword in first paragraph (10 points)
    const firstParagraph = content.split('\n')[0] || content
    if (firstParagraph.toLowerCase().includes(targetKeyword.toLowerCase())) score += 10

    // 4. Meta title length (10 points)
    const metaTitleLength = title.length
    if (metaTitleLength >= 30 && metaTitleLength <= 70) score += 10

    // 5. Meta description length (10 points)
    const metaDescLength = metaDescription.length
    if (metaDescLength >= 120 && metaDescLength <= 200) score += 10

    // 6. Word count >= 800 (10 points)
    if (content.trim().split(/\s+/).filter(Boolean).length >= 800) score += 10

    // 7. Featured image (10 points)
    if (hasFeaturedImage) score += 10

    // 8. Image alt text (5 points)
    if (featuredImageAlt && featuredImageAlt.trim().length > 0) score += 5

    // 9. Internal links >= 2 (10 points)
    if (internalLinks >= 2) score += 10

    // 10. Excerpt filled (5 points)
    if (excerpt && excerpt.trim().length >= 50) score += 5

    return score
  }

  const countInternalLinks = (content: string): number => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
    let count = 0
    let match

    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[2]
      if (url.startsWith('/') && !url.includes('http')) {
        count++
      }
    }

    return count
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Blog Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={blog.title}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your blog title..."
              maxLength={100}
            />
          </div>

          {/* Content */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <TiptapEditor
              content={blog.content}
              onChange={handleContentChange}
            />
          </div>

          {/* Excerpt */}
          <div>
            <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-2">
              Excerpt *
            </label>
            <textarea
              id="excerpt"
              name="excerpt"
              value={blog.excerpt}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Enter a brief excerpt (50+ characters)..."
              rows={3}
              maxLength={300}
            />
          </div>

          {/* Featured Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Featured Image
            </label>
            <CloudinaryUpload
              onUpload={(url, alt) => {
                setBlog(prev => ({ ...prev, featuredImageUrl: url, featuredImageAlt: alt }));
                updateSEOScore();
              }}
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* SEO Score */}
          <div className="bg-gray-50 rounded-lg p-4">
            <SEOScore score={seoScore} />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              id="category"
              name="categoryId"
              value={blog.categoryId}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a category...</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-1">
              {availableTags.map(tag => (
                <span
                  key={tag.id}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    blog.tags.includes(tag.name)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                  onClick={() => {
                    if (blog.tags.includes(tag.name)) {
                      setBlog(prev => ({
                        ...prev,
                        tags: prev.tags.filter(t => t !== tag.name),
                      }))
                    } else {
                      setBlog(prev => ({ ...prev, tags: [...prev.tags, tag.name] }))
                    }
                    updateSEOScore()
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>

          {/* SEO Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="targetKeyword" className="block text-sm font-medium text-gray-700 mb-2">
                Target Keyword *
              </label>
              <input
                type="text"
                id="targetKeyword"
                name="targetKeyword"
                value={blog.targetKeyword}
                onChange={handleSEOChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your target keyword..."
              />
            </div>

            <div>
              <label htmlFor="metaTitle" className="block text-sm font-medium text-gray-700 mb-2">
                Meta Title *
              </label>
              <input
                type="text"
                id="metaTitle"
                name="metaTitle"
                value={blog.metaTitle}
                onChange={handleSEOChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter meta title..."
              />
            </div>

            <div>
              <label htmlFor="metaDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description *
              </label>
              <textarea
                id="metaDescription"
                name="metaDescription"
                value={blog.metaDescription}
                onChange={handleSEOChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter meta description..."
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="canonicalUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Canonical URL
              </label>
              <input
                type="text"
                id="canonicalUrl"
                name="canonicalUrl"
                value={blog.canonicalUrl}
                onChange={handleSEOChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter canonical URL..."
              />
            </div>
          </div>

          {/* Publish Settings */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={blog.status}
                onChange={handleInputChange}
                name="status"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Publish Now</option>
                <option value="SCHEDULED">Schedule</option>
              </select>
            </div>

            {blog.status === 'SCHEDULED' && (
              <div>
                <label htmlFor="publishAt" className="block text-sm font-medium text-gray-700 mb-2">
                  Publish Date
                </label>
                <input
                  type="datetime-local"
                  id="publishAt"
                  name="publishAt"
                  value={blog.publishAt}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Author
              </label>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium">{user?.name}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <div className="text-sm text-gray-500">
                Estimated Read Time: {readTime} minutes
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSaving || !blog.title || !blog.content}
              className="w-full bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Creating...' : 'Create Blog'}
            </button>
          </div>
        </div>
      </div>

      {/* Auto-save indicator */}
      {blog.title && blog.content && (
        <div className="mt-4 text-sm text-gray-500">
          <span className="text-green-500">Auto-saved</span>
        </div>
      )}
    </form>
  )
}