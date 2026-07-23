import type { Metadata } from 'next'
import ResetPasswordClient from '@/app/user/reset-password/ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password | Developer Portal | MillionFlats',
  description: 'Create a new password for your MillionFlats Developer Portal account.',
}

export default function DeveloperResetPasswordPage() {
  return <ResetPasswordClient loginHref="/developer/auth?tab=login" />
}
