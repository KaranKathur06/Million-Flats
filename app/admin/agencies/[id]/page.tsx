import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import AgencyDetailClient from './AgencyDetailClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Agency Details | MillionFlats Admin' }

export default async function AdminAgencyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as any)?.role
  if (!['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER'].includes(role)) redirect('/admin')

  const profile = await (prisma as any).agencyProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
      linkedAgency: { select: { id: true, name: true } },
    },
  })

  if (!profile) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-600">Agency profile not found.</p>
          <Link href="/admin/agencies" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
            ← Back to agencies
          </Link>
        </div>
      </div>
    )
  }

  return <AgencyDetailClient profile={profile} />
}
