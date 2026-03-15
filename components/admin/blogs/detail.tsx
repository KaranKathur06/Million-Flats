import React from 'react'

type Blog = {
  title: string
  publishAt: any
  readTimeMinutes: number
  views: number
  content: string
  featuredImageUrl?: string | null
  featuredImageAlt?: string | null
  seoScore: number
  targetKeyword: string
  metaTitle: string
  metaDescription: string
  canonicalUrl?: string | null
  category: { name: string }
  author: { name: string; email: string }
  tags: Array<{ id: string; name: string }>
}

interface BlogDetailProps {
  blog?: Blog
  user?: any
}

export const BlogDetail: React.FC<BlogDetailProps> = ({ blog, user }) => {
  if (!blog) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Blog Not Found</h2>
      </div>
    )
  }

  const getSEOColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  const getSEOGrade = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 50) return 'Good'
    if (score >= 0) return 'Needs Improvement'
    return 'Poor'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Blog Details</h2>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">{blog.title}</h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>Published: {new Date(blog.publishAt).toLocaleDateString()}</span>
                <span>Read Time: {blog.readTimeMinutes} mins</span>
                <span>Views: {blog.views}</span>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Content</h4>
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: blog.content }} />
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Featured Image</h4>
              {blog.featuredImageUrl ? (
                <div className="space-y-2">
                  <img
                    src={blog.featuredImageUrl}
                    alt={blog.featuredImageAlt || 'Featured image'}
                    className="w-full rounded-lg shadow-md"
                  />
                  <p className="text-sm text-gray-500">
                    Alt Text: {blog.featuredImageAlt || 'No alt text provided'}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">No featured image</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">SEO Score</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Score</span>
                <span className={`font-bold text-lg ${getSEOColor(blog.seoScore)}`}>
                  {blog.seoScore}/100
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Grade</span>
                <span className={`font-medium ${getSEOColor(blog.seoScore)}`}>
                  {getSEOGrade(blog.seoScore)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Target Keyword</span>
                <span className="font-medium">{blog.targetKeyword}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Metadata</h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Meta Title</p>
                <p className="font-medium">{blog.metaTitle}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Meta Description</p>
                <p className="font-medium">{blog.metaDescription}</p>
              </div>
              {blog.canonicalUrl && (
                <div>
                  <p className="text-sm text-gray-500">Canonical URL</p>
                  <p className="font-medium">{blog.canonicalUrl}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Categories & Tags</h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{blog.category.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {blog.tags.map((tag: { id: string; name: string }) => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Author</h4>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {blog.author.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{blog.author.name}</p>
                <p className="text-sm text-gray-500">{blog.author.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}