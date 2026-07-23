import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot Password | Agency Portal | MillionFlats',
  description: 'Reset your MillionFlats Agency Portal password.',
}

export default function AgencyForgotPasswordPage() {
  return <ForgotPasswordForm portal="agency" />
}
