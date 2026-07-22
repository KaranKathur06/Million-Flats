import { Metadata } from 'next'
import AuthDeveloperLoginClient from './AuthDeveloperLoginClient'

export const metadata: Metadata = {
  title: 'Developer Sign In | MillionFlats',
  description: 'Sign in to your MillionFlats Developer account',
}

export default function DeveloperLoginPage() {
  return <AuthDeveloperLoginClient />
}
