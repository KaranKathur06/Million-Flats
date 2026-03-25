import React from 'react'
import { BlogContentRenderer } from '@/components/admin/blogs/blog-content-renderer'

type Blog = {
  title: string
  publishAt: any
  readTimeMinutes: number
  views: number
  content: string
  contentJson?: any
  contentHtml?: string
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
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
        <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
          <svg className="h-6 w-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white/70">Blog Not Found</h2>
        <p className="text-sm text-white/40 mt-1">The requested blog does not exist</p>
      </div>
    )
  }

  const getSEOColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 50) return 'text-amber-400'
    return 'text-red-400'
  }

  const getSEOBg = (score: number) => {
    if (score >= 80) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20'
    if (score >= 50) return 'from-amber-500/20 to-amber-500/5 border-amber-500/20'
    return 'from-red-500/20 to-red-500/5 border-red-500/20'
  }

  const getSEOGrade = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 50) return 'Good'
    return 'Needs Improvement'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">{blog.title}</h2>
          <div className="mt-2 flex items-center gap-4 text-sm text-white/40">
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {blog.publishAt ? new Date(blog.publishAt).toLocaleDateString() : 'Not published'}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {blog.readTimeMinutes} min read
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              {blog.views} views
            </span>
          </div>
        </div>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white transition-all duration-200"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Featured Image */}
          {blog.featuredImageUrl && (
            <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
              <img
                src={blog.featuredImageUrl}
                alt={blog.featuredImageAlt || 'Featured image'}
                className="w-full max-h-[400px] object-cover"
                loading="lazy"
              />
              {blog.featuredImageAlt && (
                <div className="px-4 py-2 bg-white/[0.02] text-xs text-white/40">
                  {blog.featuredImageAlt}
                </div>
              )}
            </div>
          )}

          {/* Content — using JSON renderer if available, else fallback */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
            {blog.contentJson ? (
              <BlogContentRenderer content={blog.contentJson} />
            ) : (
              <div className="prose prose-invert max-w-none">
                {/* Fallback: render HTML content safely using a read-only TipTap instance would be ideal, 
                    but for backward compat, we parse and render basic HTML */}
                <FallbackHtmlRenderer html={blog.contentHtml || blog.content} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* SEO Score */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">SEO Score</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getSEOBg(blog.seoScore)} border flex items-center justify-center`}>
                    <span className={`text-sm font-bold ${getSEOColor(blog.seoScore)}`}>{blog.seoScore}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/90">Score</p>
                    <p className={`text-xs font-medium ${getSEOColor(blog.seoScore)}`}>{getSEOGrade(blog.seoScore)}</p>
                  </div>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    blog.seoScore >= 80 ? 'bg-emerald-500' : blog.seoScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(blog.seoScore, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">Metadata</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-white/40 mb-1">Target Keyword</p>
                <p className="text-sm font-medium text-white/80">{blog.targetKeyword || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Meta Title</p>
                <p className="text-sm font-medium text-white/80">{blog.metaTitle}</p>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1">Meta Description</p>
                <p className="text-sm text-white/70">{blog.metaDescription}</p>
              </div>
              {blog.canonicalUrl && (
                <div>
                  <p className="text-xs text-white/40 mb-1">Canonical URL</p>
                  <p className="text-sm text-amber-400/80 break-all">{blog.canonicalUrl}</p>
                </div>
              )}
            </div>
          </div>

          {/* Categories & Tags */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">Categories & Tags</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-white/40 mb-1.5">Category</p>
                <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm font-medium text-white/80">
                  {blog.category.name}
                </span>
              </div>
              <div>
                <p className="text-xs text-white/40 mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {blog.tags.length > 0 ? (
                    blog.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2.5 py-1 rounded-md bg-amber-400/10 border border-amber-400/20 text-xs font-medium text-amber-300"
                      >
                        {tag.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-white/30">No tags</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Author */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4">Author</h4>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-[#0b1220] font-bold text-sm">
                {blog.author.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">{blog.author.name}</p>
                <p className="text-xs text-white/40">{blog.author.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple fallback renderer for legacy HTML content
function FallbackHtmlRenderer({ html }: { html: string }) {
  if (!html) return <p className="text-white/40">No content available</p>

  // Parse HTML into simple text segments for safe rendering
  // This is a basic approach — the proper path is always contentJson
  const segments = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .filter((s) => s.trim())

  return (
    <div className="space-y-3">
      {segments.map((segment, i) => (
        <p key={i} className="text-white/70 leading-relaxed">
          {segment.trim()}
        </p>
      ))}
    </div>
  )
}