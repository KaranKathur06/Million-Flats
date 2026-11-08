import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BadgeCheck, ShieldAlert } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getPassportCategoryMeta } from '@/lib/passport'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'MillionFlats Passport Verification',
  robots: { index: false, follow: false },
}

export default async function PassportVerificationPage({
  params,
}: {
  params: { reference: string }
}) {
  const membership = await prisma.passportMembership.findUnique({
    where: { qrCodeValue: params.reference },
    include: { user: { select: { name: true } } },
  })

  if (!membership) notFound()

  const category = getPassportCategoryMeta(membership.category)
  const isActive = membership.status === 'ACTIVE'

  return (
    <main className="min-h-screen bg-[#f5f6f7] px-4 py-12 sm:px-6 sm:py-16">
      <section className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(13,31,56,0.12)]">
        <div className="bg-dark-blue px-6 py-7 text-white sm:px-8">
          <div className="flex items-center gap-3">
            <span className={`grid h-11 w-11 place-items-center rounded-full ${
              isActive ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'
            }`}>
              {isActive ? <BadgeCheck size={23} aria-hidden="true" /> : <ShieldAlert size={22} aria-hidden="true" />}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">MillionFlats</p>
              <h1 className="mt-1 text-xl font-semibold">Passport verification</h1>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <div className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
            isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
          }`}>
            {isActive ? 'Active membership' : 'Membership not active'}
          </div>
          <dl className="mt-6 divide-y divide-slate-100">
            <div className="py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Member</dt>
              <dd className="mt-1 text-base font-semibold text-slate-900">{membership.user.name || 'MillionFlats member'}</dd>
            </div>
            <div className="py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Membership category</dt>
              <dd className="mt-1 text-base font-semibold text-slate-900">{category?.label || membership.category}</dd>
            </div>
            <div className="py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Membership number</dt>
              <dd className="mt-1 font-mono text-sm font-semibold text-slate-900">{membership.membershipNumber}</dd>
            </div>
            <div className="py-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Issue date</dt>
              <dd className="mt-1 text-sm text-slate-700">
                {membership.issueDate.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
          <p className="mt-4 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            This page verifies the membership status associated with this secure reference. It does not display account contact or payment details.
          </p>
        </div>
      </section>
    </main>
  )
}
