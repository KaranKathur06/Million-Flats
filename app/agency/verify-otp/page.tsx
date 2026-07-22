import { Suspense } from 'react'
import AgencyVerifyOtpClient from './AgencyVerifyOtpClient'

export const metadata = {
  title: 'Verify Your Email | Agency Portal | MillionFlats',
  description: 'Enter the verification code sent to your email to activate your agency account.',
}

export default function AgencyVerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <AgencyVerifyOtpClient />
    </Suspense>
  )
}
