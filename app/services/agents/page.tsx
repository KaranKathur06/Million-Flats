import type { Metadata } from 'next'
import ServiceSegmentPage from '@/components/services/ServiceSegmentPage'
import { SERVICE_SEGMENTS } from '@/lib/services/segmentContent'
import { buildSocialMetadata } from '@/lib/socialMetadata'

export const metadata: Metadata = {
  title: 'MillionFlats | Real Estate Agent Plans',
  description: SERVICE_SEGMENTS.agents.description,
  alternates: { canonical: '/services/agents' },
  ...buildSocialMetadata({
    title: 'Real Estate Agent Plans | MillionFlats',
    description: SERVICE_SEGMENTS.agents.description,
    url: '/services/agents',
  }),
}

export default function AgentPlansPage() {
  return <ServiceSegmentPage segment={SERVICE_SEGMENTS.agents} />
}