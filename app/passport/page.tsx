import { getServerSession } from 'next-auth'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import PassportMembershipPanel from '@/components/passport/PassportMembershipPanel'

export const dynamic = 'force-dynamic'

export default async function PassportPage() {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { id?: string; email?: string | null; name?: string | null } | undefined
  const email = String(sessionUser?.email || '').trim().toLowerCase()

  let membership: null | {
    id: string
    category: string
    membershipNumber: string
    status: string
    issueDate: string
    qrCodeValue: string
    paymentReference: string | null
  } = null

  if (email) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    })

    const current = user ? await prisma.passportMembership.findUnique({ where: { userId: user.id } }) : null
    if (current) {
      membership = {
        id: current.id,
        category: current.category,
        membershipNumber: current.membershipNumber,
        status: current.status,
        issueDate: current.issueDate.toISOString(),
        qrCodeValue: current.qrCodeValue,
        paymentReference: current.paymentReference,
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Member access</p>
            <h1 className="mt-2 text-4xl font-serif font-bold text-slate-900">MillionFlats Passport</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400">
              Back to home
            </Link>
          </div>
        </div>

        <PassportMembershipPanel
          userName={sessionUser?.name || null}
          userEmail={sessionUser?.email || null}
          initialMembership={membership}
          dashboard={false}
        />
      </div>
    </main>
  )
}
