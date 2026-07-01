import { redirect } from 'next/navigation'

export default function AgencyRegisterPage() {
  redirect('/agency/auth?tab=register')
}
