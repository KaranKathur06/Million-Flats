import { Suspense } from 'react'
import UserLoginClient from './UserLoginClient'

export default function UserLoginPage() {
  return (
    <Suspense fallback={null}>
      <UserLoginClient />
    </Suspense>
  )
}
