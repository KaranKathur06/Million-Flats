import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AdminAgentsTableClient from './AdminAgentsTableClient'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function AdminAgentsPage() {
  const session = await getServerSession(authOptions)
  const role = String((session?.user as any)?.role || '').toUpperCase()

  if (!session?.user) {
    redirect('/user/login?next=%2Fadmin%2Fagents')
  }

  if (role !== 'ADMIN') {
    redirect('/user/dashboard?error=admin_only')
  }

  const rows = await (prisma as any).user.findMany({
    where: { role: 'AGENT' },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      verified: true,
      createdAt: true,
      agent: {
        select: {
          id: true,
          company: true,
          license: true,
          whatsapp: true,
          approved: true,
          profileCompletion: true,
          createdAt: true,
        },
      },
    },
  })

  const items = (rows as any[]).map((u) => {
    const agent = u.agent
    return {
      userId: String(u.id),
      agentId: safeString(agent?.id),
      name: safeString(u.name) || safeString(u.email) || 'Agent',
      email: safeString(u.email),
      phone: safeString(u.phone),
      verified: Boolean(u.verified),
      createdAt: u.createdAt ? new Date(u.createdAt).toLocaleString() : '',
      company: safeString(agent?.company),
      license: safeString(agent?.license),
      whatsapp: safeString(agent?.whatsapp),
      approved: Boolean(agent?.approved),
      profileCompletion: typeof agent?.profileCompletion === 'number' ? agent.profileCompletion : 0,
    }
  })

  return (
    <div className="min-h-screen bg-[#0b1220] py-10 text-white">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
          <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Admin</p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <h1 className="text-3xl font-serif font-bold">Agents</h1>
            <Link href="/admin" className="text-sm font-semibold text-white/80 hover:text-white">
              Back to dashboard
            </Link>
          </div>

          <div className="mt-6">
            <AdminAgentsTableClient items={items} />
          </div>
        </div>
      </div>
    </div>
  )
}
