import type { Metadata } from 'next'
import React from 'react'
import './globals.css'
import AppProviders from '@/components/AppProviders'
import AppShell from '@/components/AppShell'

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
    <html lang="en">
      <body className="font-sans antialiased">
        <AppProviders>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  )
}
