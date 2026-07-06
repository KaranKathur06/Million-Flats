import { redirect } from 'next/navigation'

export default function AuthRegisterAgentPage() {
  redirect('/agent/auth?tab=register')
}
