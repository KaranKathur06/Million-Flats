import { redirect } from 'next/navigation'

// Permanently moved to unified /developer/auth
export default function DeveloperRegisterPage() {
  redirect('/developer/auth?tab=register')
}
