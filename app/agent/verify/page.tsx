import { Suspense } from 'react'
import VerifyClient from '@/app/agent/verify/VerifyClient'

export default function AgentVerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyClient />
    </Suspense>
  )
}
