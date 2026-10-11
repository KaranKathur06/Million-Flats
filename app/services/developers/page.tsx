import type { Metadata } from 'next'
import ServiceSegmentPage from '@/components/services/ServiceSegmentPage'
import { SERVICE_SEGMENTS } from '@/lib/services/segmentContent'
import { buildSocialMetadata } from '@/lib/socialMetadata'

export const metadata: Metadata = {
  title: 'MillionFlats | Real Estate Developer Plans',
  description: SERVICE_SEGMENTS.developers.description,
  alternates: { canonical: '/services/developers' },
  ...buildSocialMetadata({
    title: 'Real Estate Developer Plans | MillionFlats',
    description: SERVICE_SEGMENTS.developers.description,
    url: '/services/developers',
  }),
}

export default function DeveloperPlansPage() {
  return <ServiceSegmentPage segment={SERVICE_SEGMENTS.developers} />
}