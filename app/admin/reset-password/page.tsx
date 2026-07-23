import type { Metadata } from 'next'
import ResetPasswordClient from '@/app/user/reset-password/ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password | Admin | MillionFlats',
  description: 'Create a new password for your MillionFlats admin account.',
}

export default function AdminResetPasswordPage() {
  return <ResetPasswordClient loginHref="/admin/login" />
}
