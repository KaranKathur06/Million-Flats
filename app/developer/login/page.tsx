import { redirect } from 'next/navigation'

// Permanently moved to unified /developer/auth
export default function DeveloperLoginPage() {
  redirect('/developer/auth?tab=login')
}
