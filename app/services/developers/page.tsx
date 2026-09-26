import type { Metadata } from 'next'
import ServiceSegmentPage from '@/components/services/ServiceSegmentPage'
import { SERVICE_SEGMENTS } from '@/lib/services/segmentContent'

export const metadata: Metadata = {
  title: 'MillionFlats | Real Estate Developer Plans',
  description: SERVICE_SEGMENTS.developers.description,
  alternates: { canonical: '/services/developers' },
  openGraph: {
    title: 'Real Estate Developer Plans | MillionFlats',
    description: SERVICE_SEGMENTS.developers.description,
    url: '/services/developers',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Real Estate Developer Plans | MillionFlats',
    description: SERVICE_SEGMENTS.developers.description,
  },
}

export default function DeveloperPlansPage() {
  return <ServiceSegmentPage segment={SERVICE_SEGMENTS.developers} />
}