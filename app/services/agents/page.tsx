import type { Metadata } from 'next'
import ServiceSegmentPage from '@/components/services/ServiceSegmentPage'
import { SERVICE_SEGMENTS } from '@/lib/services/segmentContent'

export const metadata: Metadata = {
  title: 'MillionFlats | Real Estate Agent Plans',
  description: SERVICE_SEGMENTS.agents.description,
  alternates: { canonical: '/services/agents' },
  openGraph: {
    title: 'Real Estate Agent Plans | MillionFlats',
    description: SERVICE_SEGMENTS.agents.description,
    url: '/services/agents',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Real Estate Agent Plans | MillionFlats',
    description: SERVICE_SEGMENTS.agents.description,
  },
}

export default function AgentPlansPage() {
  return <ServiceSegmentPage segment={SERVICE_SEGMENTS.agents} />
}