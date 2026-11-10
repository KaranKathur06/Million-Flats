import type { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  isPassportCategoryKey,
  PASSPORT_PRICE_INR,
  PASSPORT_PRICE_LABEL,
} from '@/lib/passport'
import PassportMembershipPanel from '@/components/passport/PassportMembershipPanel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'MillionFlats Passport | One Digital Membership',
  description: `Choose your MillionFlats Passport category. One digital membership, one fixed price of ${PASSPORT_PRICE_LABEL}.`,
  alternates: { canonical: '/passport' },
  openGraph: {
    title: 'MillionFlats Passport | One Digital Membership',
    description: `One digital MillionFlats membership at a fixed price of ${PASSPORT_PRICE_LABEL}.`,
    url: 'https://www.millionflats.com/passport',
    siteName: 'MillionFlats',
    type: 'website',
    images: [{
      url: '/meta.jpeg',
      width: 1200,
      height: 630,
      alt: 'MillionFlats Passport digital membership',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MillionFlats Passport | One Digital Membership',
    description: `One digital MillionFlats membership at a fixed price of ${PASSPORT_PRICE_LABEL}.`,
    images: ['https://www.millionflats.com/meta.jpeg'],
  },
}

const passportProductJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'MillionFlats Passport',
  description: 'A digital MillionFlats membership linked to one account and one selected category.',
  brand: { '@type': 'Brand', name: 'MillionFlats' },
  offers: {
    '@type': 'Offer',
    url: 'https://www.millionflats.com/passport',
    priceCurrency: 'INR',
    price: PASSPORT_PRICE_INR,
    availability: 'https://schema.org/InStock',
  },
}

export default async function PassportPage({
  searchParams,
}: {
  searchParams?: { category?: string | string[] }
}) {
  const session = await getServerSession(authOptions)
  const sessionUser = session?.user as { email?: string | null; name?: string | null } | undefined
  const email = String(sessionUser?.email || '').trim().toLowerCase()
  const user = email
    ? await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true },
      })
    : null

  const [membership, pendingOrder] = user
    ? await Promise.all([
        prisma.passportMembership.findUnique({ where: { userId: user.id } }),
        prisma.passportOrder.findUnique({
          where: { userId: user.id },
          select: { category: true, status: true },
        }),
      ])
    : [null, null]
  const initialCategory = typeof searchParams?.category === 'string'
    && isPassportCategoryKey(searchParams.category)
    ? searchParams.category
    : null

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(passportProductJsonLd) }}
      />
      <PassportMembershipPanel
        userName={user?.name || sessionUser?.name || null}
        userEmail={user?.email || sessionUser?.email || null}
        isAuthenticated={Boolean(user)}
        initialMembership={membership ? {
          id: membership.id,
          category: membership.category,
          membershipNumber: membership.membershipNumber,
          status: membership.status,
          issueDate: membership.issueDate.toISOString(),
          qrCodeValue: membership.qrCodeValue,
          paymentReference: membership.paymentReference,
        } : null}
        pendingCategory={pendingOrder?.status === 'PENDING' ? pendingOrder.category : null}
        initialCategory={initialCategory}
      />
    </main>
  )
}
