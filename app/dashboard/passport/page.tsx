import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PassportMembershipPanel from '@/components/passport/PassportMembershipPanel'

export default async function DashboardPassportPage() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { id?: string; email?: string | null; name?: string | null } | undefined

  if (!sessionUser?.email) {
    redirect('/auth/login?next=%2Fdashboard%2Fpassport')
  }

  const user = await prisma.user.findUnique({
    where: { email: String(sessionUser.email).trim().toLowerCase() },
    select: { id: true, name: true, email: true },
  })

  if (!user) {
    redirect('/auth/login?next=%2Fdashboard%2Fpassport')
  }

  const [membership, pendingOrder] = await Promise.all([
    prisma.passportMembership.findUnique({ where: { userId: user.id } }),
    prisma.passportOrder.findUnique({
      where: { userId: user.id },
      select: { category: true, status: true },
    }),
  ])

  return (
    <main className="min-h-screen bg-slate-100 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-700">Dashboard</p>
            <h1 className="mt-2 text-3xl font-serif font-bold text-slate-900">My Passport</h1>
          </div>
          <Link href="/dashboard" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400">
            Back to dashboard
          </Link>
        </div>

        <PassportMembershipPanel
          userName={user.name || sessionUser.name || null}
          userEmail={user.email || sessionUser.email || null}
          isAuthenticated
          pendingCategory={pendingOrder?.status === 'PENDING' ? pendingOrder.category : null}
          initialMembership={membership ? {
            id: membership.id,
            category: membership.category,
            membershipNumber: membership.membershipNumber,
            status: membership.status,
            issueDate: membership.issueDate.toISOString(),
            qrCodeValue: membership.qrCodeValue,
            paymentReference: membership.paymentReference,
          } : null}
          dashboard
        />
      </div>
    </main>
  )
}
