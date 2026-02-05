import type { Metadata } from 'next'
import React, { Suspense } from 'react'
import { Public_Sans } from 'next/font/google'
import './globals.css'
import AppProviders from '@/components/AppProviders'
import AppShell from '@/components/AppShell'
import GoogleAnalytics from '@/components/GoogleAnalytics'

const publicSans = Public_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-public-sans',
})

export const metadata: Metadata = {
  title: 'millionflats - Premium Luxury Real Estate in UAE',
  description: 'Premium luxury real estate in UAE for discerning investors and buyers. Explore properties in Dubai, Abu Dhabi, Sharjah, and across the Emirates.',
  keywords: 'luxury real estate UAE, premium properties Dubai, Abu Dhabi properties, luxury villas UAE, penthouses Dubai, real estate UAE',
  icons: {
    icon: '/LOGO.png',
    apple: '/LOGO.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={publicSans.variable}>
      <body className="font-sans antialiased">
        <Suspense fallback={null}>
          <GoogleAnalytics />
        </Suspense>
        <AppProviders>
          <Suspense fallback={null}>
            <AppShell>{children}</AppShell>
          </Suspense>
        </AppProviders>
      </body>
    </html>
  )
}
