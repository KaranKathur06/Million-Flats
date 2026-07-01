import type { Metadata } from 'next'
import { Suspense } from 'react'
import AgencyOnboardingClient from './AgencyOnboardingClient'

export const metadata: Metadata = {
  title: 'Complete Your Agency Profile | MillionFlats',
  description: 'Complete your agency profile to start listing properties and receiving leads on MillionFlats.',
}

export default function AgencyOnboardingPage() {
  return (
    <Suspense>
      <AgencyOnboardingClient />
    </Suspense>
  )
}
