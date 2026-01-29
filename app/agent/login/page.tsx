import { Suspense } from 'react'
import AgentLoginClient from './AgentLoginClient'

export default function AgentLoginPage() {
  return (
    <Suspense fallback={null}>
      <AgentLoginClient />
    </Suspense>
  )
}
