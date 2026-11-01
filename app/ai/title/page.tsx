import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AIPageSkeleton } from '@/components/ai-shared/AISkeletons'
import AITitle from './AITitle'
import {
  requireAiInformationPageAccess,
  type AiInformationSearchParams,
} from '@/lib/auth/ai-login-policy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AITitle™ Legal Document Intelligence | MillionFlats',
  description: 'AI-powered title deed analysis, RERA compliance, NOC verification, and legal risk scoring for UAE and India properties.',
  alternates: { canonical: '/ai/title' },
}

export default async function AITitlePage({
  searchParams,
}: {
  searchParams?: AiInformationSearchParams
}) {
  await requireAiInformationPageAccess('/ai/title', searchParams)

  return (
    <Suspense fallback={<AIPageSkeleton />}>
      <AITitle />
    </Suspense>
  )
}
