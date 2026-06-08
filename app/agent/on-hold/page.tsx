import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OnHoldClient from './ui/OnHoldClient'

export default async function AgentOnHoldPage() {
  const session = await getServerSession(authOptions)
  const status = (session?.user as any)?.agentStatus || 'REGISTERED'

  return <OnHoldClient status={status} />
}
