'use client'

import { useEffect } from 'react'

type BlogViewTrackerProps = {
  slug: string
}

export default function BlogViewTracker({ slug }: BlogViewTrackerProps) {
  useEffect(() => {
    if (!slug) return
    fetch(`/api/public/blogs/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {})
  }, [slug])

  return null
}

