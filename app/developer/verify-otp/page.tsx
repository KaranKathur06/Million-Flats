import { Suspense } from 'react'
import DeveloperVerifyOtpClient from './DeveloperVerifyOtpClient'

export const metadata = {
  title: 'Verify Your Email | Developer Portal | MillionFlats',
  description: 'Enter the verification code sent to your email to activate your developer account.',
}

export default function DeveloperVerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <DeveloperVerifyOtpClient />
    </Suspense>
  )
}
