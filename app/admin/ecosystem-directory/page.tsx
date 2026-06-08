import { redirect } from 'next/navigation'

/** Legacy route — partner directory management is tied to approved ecosystem leads. */
export default function AdminEcosystemDirectoryRedirect() {
  redirect('/admin/leads?leadType=ECOSYSTEM&status=ONBOARDED')
}
