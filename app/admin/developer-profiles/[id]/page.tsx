import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import AdminDeveloperProfileReviewClient from './AdminDeveloperProfileReviewClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Review Developer Application | MillionFlats Admin' }

export default async function AdminDeveloperProfileReviewPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/auth/login')
  const role = (session.user as any)?.role
  if (!['ADMIN', 'SUPERADMIN', 'MODERATOR'].includes(role)) redirect('/admin')

  const profile = await (prisma as any).developerProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
      documents: { orderBy: { createdAt: 'desc' } },
      linkedDeveloper: { select: { id: true, name: true, slug: true, logo: true } },
      notifications: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  if (!profile) notFound()

  // All developers rows for linking
  const allDevelopers = await (prisma as any).developer.findMany({
    where: { isDeleted: false },
    select: { id: true, name: true, slug: true },
    orderBy: { name: 'asc' },
  })

  return (
    <AdminDeveloperProfileReviewClient
      profile={JSON.parse(JSON.stringify(profile))}
      allDevelopers={allDevelopers}
    />
  )
}
