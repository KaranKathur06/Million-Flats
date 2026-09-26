import type { Metadata } from 'next'
import ServiceSegmentPage from '@/components/services/ServiceSegmentPage'
import { SERVICE_SEGMENTS } from '@/lib/services/segmentContent'

export const metadata: Metadata = {
  title: 'MillionFlats | Real Estate Agency Solutions',
  description: SERVICE_SEGMENTS.agencies.description,
  alternates: { canonical: '/services/agencies' },
  openGraph: {
    title: 'Real Estate Agency Solutions | MillionFlats',
    description: SERVICE_SEGMENTS.agencies.description,
    url: '/services/agencies',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Real Estate Agency Solutions | MillionFlats',
    description: SERVICE_SEGMENTS.agencies.description,
  },
}

export default function AgencySolutionsPage() {
  return <ServiceSegmentPage segment={SERVICE_SEGMENTS.agencies} />
}