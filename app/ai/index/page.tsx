import { Suspense } from 'react'
import { AIPageSkeleton } from '@/components/ai-shared/AISkeletons'
import AIIndexClient from './AIIndexClient'
import {
  requireAiInformationPageAccess,
  type AiInformationSearchParams,
} from '@/lib/auth/ai-login-policy'

export const dynamic = 'force-dynamic'

export default async function AIIndexPage({
  searchParams,
}: {
  searchParams?: AiInformationSearchParams
}) {
  await requireAiInformationPageAccess('/ai/index', searchParams)

  return (
    <Suspense fallback={<AIPageSkeleton />}>
      <AIIndexClient />
    </Suspense>
  )
}
