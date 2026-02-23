'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import CountryProvider from '@/components/CountryProvider'
import MarketProvider from '@/components/MarketProvider'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CountryProvider>
        <MarketProvider>{children}</MarketProvider>
      </CountryProvider>
    </SessionProvider>
  )
}
