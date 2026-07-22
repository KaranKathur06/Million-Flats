import type { Metadata } from 'next'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password | Developer Portal | MillionFlats',
  description: 'Create a new secure password for your MillionFlats Developer Portal account.',
}

export default function DeveloperResetPasswordPage() {
  return <ResetPasswordClient />
}
