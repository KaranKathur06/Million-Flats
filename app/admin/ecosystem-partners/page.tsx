import { redirect } from 'next/navigation'

export default function AdminEcosystemPartnersRedirect({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const stage = typeof searchParams?.stage === 'string' ? searchParams.stage : ''
  const category = typeof searchParams?.category === 'string' ? searchParams.category : ''

  const p = new URLSearchParams()
  p.set('leadType', 'ECOSYSTEM')
  if (stage) p.set('status', stage)
  if (category) p.set('category', category)

  redirect(`/admin/leads?${p.toString()}`)
}
