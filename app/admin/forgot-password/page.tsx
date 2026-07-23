import type { Metadata } from 'next'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Forgot Password | Admin | MillionFlats',
  description: 'Reset your MillionFlats admin password.',
}

export default function AdminForgotPasswordPage() {
  return <ForgotPasswordForm portal="admin" />
}
