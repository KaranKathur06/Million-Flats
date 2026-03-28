import type { Metadata } from 'next'
import BlogsClient from './BlogsClient'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blogs | MillionFlats',
  description:
    'Read MillionFlats real estate insights, market updates, investment guides, and practical property intelligence.',
}

export default function BlogsPage() {
  return <BlogsClient />
}
