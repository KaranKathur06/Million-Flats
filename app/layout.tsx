import type { Metadata } from 'next'
import React from 'react'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'millionflats - Premium Luxury Real Estate in UAE',
  description: 'Premium luxury real estate in UAE for discerning investors and buyers. Explore properties in Dubai, Abu Dhabi, Sharjah, and across the Emirates.',
  keywords: 'luxury real estate UAE, premium properties Dubai, Abu Dhabi properties, luxury villas UAE, penthouses Dubai, real estate UAE',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}

