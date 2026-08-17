import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import { Public_Sans } from 'next/font/google'
import { getServerSession } from 'next-auth'
import './globals.css'
import AppProviders from '@/components/AppProviders'
import AppShell from '@/components/AppShell'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import AnalyticsTracker from '@/components/AnalyticsTracker'
import { authOptions } from '@/lib/auth'

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-public-sans',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.millionflats.com'),
  title: 'MillionFlats | Global Luxury Real Estate Marketplace',
  description:
    'Safely invest in premium ₹3Cr+ villas, penthouses, and off-plan projects across India and Dubai. Fully backed by institutional compliance, secure LRS/FEMA routing, and 3D digital twins.',
  keywords:
    'global luxury real estate, premium villas India, penthouses Dubai, off-plan projects, LRS FEMA routing, 3D digital twins',
  icons: {
    icon: '/FAVICON.jpeg',
    apple: '/LOGO.jpeg',
  },
  alternates: {
    canonical: 'https://www.millionflats.com/',
  },
  openGraph: {
    title: 'MillionFlats | Global Luxury Real Estate Marketplace',
    description:
      'Safely invest in premium ₹3Cr+ villas, penthouses, and off-plan projects across India and Dubai. Fully backed by institutional compliance, secure LRS/FEMA routing, and 3D digital twins.',
    siteName: 'MillionFlats',
    type: 'website',
    url: 'https://www.millionflats.com/',
    images: [
      {
        url: '/meta.jpeg',
        width: 1200,
        height: 630,
        alt: 'MillionFlats | Global Luxury Real Estate Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MillionFlats | Global Luxury Real Estate Marketplace',
    description:
      'Safely invest in premium ₹3Cr+ villas, penthouses, and off-plan projects across India and Dubai. Fully backed by institutional compliance, secure LRS/FEMA routing, and 3D digital twins.',
    images: ['https://www.millionflats.com/meta.jpeg'],
  },
  other: {
    'p:domain_verify': 'e6933b23e105c64206750c2e27779d48',
    'og:image': 'https://www.millionflats.com/meta.jpeg',
    'og:image:secure_url': 'https://www.millionflats.com/meta.jpeg',
    'og:image:type': 'image/jpeg',
    'og:image:width': '1200',
    'og:image:height': '630',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="en" className={publicSans.variable}>
      <body className="font-sans antialiased">
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <AppProviders session={session}>
          <Suspense fallback={null}>
            <AnalyticsTracker />
          </Suspense>
          <Suspense fallback={null}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </AppProviders>
      </body>
    </html>
  )
}
