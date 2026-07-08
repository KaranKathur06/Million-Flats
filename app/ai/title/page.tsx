import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AIPageSkeleton } from '@/components/ai-shared/AISkeletons'
import AITitle from './AITitle'

export const metadata: Metadata = {
  title: 'AITitle™ Legal Document Intelligence | MillionFlats',
  description: 'AI-powered title deed analysis, RERA compliance, NOC verification, and legal risk scoring for UAE and India properties.',
  alternates: { canonical: '/ai/title' },
}

export default function AITitlePage() {
  return (
    <Suspense fallback={<AIPageSkeleton />}>
      <AITitle />
    </Suspense>
  )
}
