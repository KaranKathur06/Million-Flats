import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AIPageSkeleton } from '@/components/ai-shared/AISkeletons'
import AIView from './AIView'

export const metadata: Metadata = {
  title: 'AIView™ Property Media Intelligence | MillionFlats',
  description: 'AI-powered image authenticity detection, virtual staging analysis, defect detection, and media quality scoring for real estate listings.',
  alternates: { canonical: '/ai/view' },
}

export default function AIViewPage() {
  return (
    <Suspense fallback={<AIPageSkeleton />}>
      <AIView />
    </Suspense>
  )
}
