import { Suspense } from 'react'
import VerifyClient from '@/app/user/verify/VerifyClient'

export default function UserVerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyClient />
    </Suspense>
  )
}

