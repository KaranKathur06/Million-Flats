import { Metadata } from 'next'
import AuthAgencyLoginClient from './AuthAgencyLoginClient'

export const metadata: Metadata = {
  title: 'Agency Sign In | MillionFlats',
  description: 'Sign in to your MillionFlats Agency account',
}

export default function AgencyLoginPage() {
  return <AuthAgencyLoginClient />
}
