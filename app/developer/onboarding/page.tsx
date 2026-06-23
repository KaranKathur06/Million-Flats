import type { Metadata } from 'next'
import { Suspense } from 'react'
import DeveloperOnboardingClient from './DeveloperOnboardingClient'

export const metadata: Metadata = {
  title: 'Set Up Your Profile | MillionFlats Developer Portal',
  description: 'Complete your developer profile to start publishing projects and receiving leads on MillionFlats.',
}

export default function DeveloperOnboardingPage() {
  return (
    <Suspense>
      <DeveloperOnboardingClient />
    </Suspense>
  )
}
