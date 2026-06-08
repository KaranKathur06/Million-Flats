import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import AgentReviewClient from './AgentReviewClient'

export default async function AdminAgentReviewPage({
    params,
}: {
    params: { agentId: string }
}) {
    const session = await getServerSession(authOptions)
    const role = normalizeRole((session?.user as any)?.role)

    if (!session?.user) {
        redirect('/user/login?next=%2Fadmin%2Fagents')
    }

    if (!hasMinRole(role, 'ADMIN')) {
        redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
    }

    return <AgentReviewClient agentId={params.agentId} currentRole={role} />
}
