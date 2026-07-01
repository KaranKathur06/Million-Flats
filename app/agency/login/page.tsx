import { redirect } from 'next/navigation'

export default function AgencyLoginPage() {
  redirect('/agency/auth?tab=login')
}
