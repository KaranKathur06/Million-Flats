import type { Metadata } from 'next'
import ForgotPasswordClient from './ForgotPasswordClient'

export const metadata: Metadata = {
  title: 'Forgot Password | Developer Portal | MillionFlats',
  description: 'Reset your MillionFlats Developer Portal password securely via email verification.',
}

export default function DeveloperForgotPasswordPage() {
  return <ForgotPasswordClient />
}
