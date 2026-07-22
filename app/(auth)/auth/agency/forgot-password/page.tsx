import type { Metadata } from 'next'
import ForgotPasswordClient from './ForgotPasswordClient'

export const metadata: Metadata = {
  title: 'Forgot Password | Agency Portal | MillionFlats',
  description: 'Reset your MillionFlats Agency Portal password securely via email verification.',
}

export default function AgencyForgotPasswordPage() {
  return <ForgotPasswordClient />
}
