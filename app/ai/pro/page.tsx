import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AIPageSkeleton } from '@/components/ai-shared/AISkeletons'
import AIPro from './AIPro'
import {
  requireAiInformationPageAccess,
  type AiInformationSearchParams,
} from '@/lib/auth/ai-login-policy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AIPro™ Agent Intelligence | MillionFlats',
  description: 'AI-powered agent performance scoring, churn prediction, lead intelligence, and coaching for real estate professionals on the MillionFlats platform.',
  alternates: { canonical: '/ai/pro' },
}

export default async function AIProPage({
  searchParams,
}: {
  searchParams?: AiInformationSearchParams
}) {
  await requireAiInformationPageAccess('/ai/pro', searchParams)

  return (
    <Suspense fallback={<AIPageSkeleton />}>
      <AIPro />
    </Suspense>
  )
}
