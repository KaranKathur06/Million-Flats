import type { Metadata } from 'next'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password | Agency Portal | MillionFlats',
  description: 'Create a new secure password for your MillionFlats Agency Portal account.',
}

export default function AgencyResetPasswordPage() {
  return <ResetPasswordClient />
}
