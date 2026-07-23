import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot Password | Developer Portal | MillionFlats',
  description: 'Reset your MillionFlats Developer Portal password.',
}

export default function DeveloperForgotPasswordPage() {
  return <ForgotPasswordForm portal="developer" />
}
