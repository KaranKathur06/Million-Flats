import type { Metadata } from 'next'
import { Suspense } from 'react'
import DeveloperRegisterClient from './DeveloperRegisterClient'

export const metadata: Metadata = {
  title: 'Register as Developer | MillionFlats',
  description: 'Register your real estate development company on MillionFlats. Publish projects, manage leads, and reach buyers across India and the UAE.',
}

export default function DeveloperRegisterPage() {
  return (
    <Suspense>
      <DeveloperRegisterClient />
    </Suspense>
  )
}
