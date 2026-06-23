import type { Metadata } from 'next'
import { Suspense } from 'react'
import DeveloperLoginClient from './DeveloperLoginClient'

export const metadata: Metadata = {
  title: 'Developer Login | MillionFlats',
  description: 'Sign in to the MillionFlats Developer Portal to manage your projects, leads, and company profile.',
}

export default function DeveloperLoginPage() {
  return (
    <Suspense>
      <DeveloperLoginClient />
    </Suspense>
  )
}
