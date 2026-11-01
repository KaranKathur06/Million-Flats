import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AIPageSkeleton } from '@/components/ai-shared/AISkeletons'
import AIView from './AIView'
import {
  requireAiInformationPageAccess,
  type AiInformationSearchParams,
} from '@/lib/auth/ai-login-policy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AIView™ Property Media Intelligence | MillionFlats',
  description: 'AI-powered image authenticity detection, virtual staging analysis, defect detection, and media quality scoring for real estate listings.',
  alternates: { canonical: '/ai/view' },
}

export default async function AIViewPage({
  searchParams,
}: {
  searchParams?: AiInformationSearchParams
}) {
  await requireAiInformationPageAccess('/ai/view', searchParams)

  return (
    <Suspense fallback={<AIPageSkeleton />}>
      <AIView />
    </Suspense>
  )
}
