import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot Password | Agent Portal | MillionFlats',
  description: 'Reset your MillionFlats Agent Portal password.',
}

export default function AgentForgotPasswordPage() {
  return <ForgotPasswordForm portal="agent" />
}
