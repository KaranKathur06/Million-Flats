import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AIPageSkeleton } from '@/components/ai-shared/AISkeletons'
import AIPro from './AIPro'

export const metadata: Metadata = {
  title: 'AIPro™ Agent Intelligence | MillionFlats',
  description: 'AI-powered agent performance scoring, churn prediction, lead intelligence, and coaching for real estate professionals on the MillionFlats platform.',
  alternates: { canonical: '/ai/pro' },
}

export default function AIProPage() {
  return (
    <Suspense fallback={<AIPageSkeleton />}>
      <AIPro />
    </Suspense>
  )
}
