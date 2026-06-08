'use client'

import React from 'react'
import { SessionProvider, type SessionProviderProps } from 'next-auth/react'
import CountryProvider from '@/components/CountryProvider'
import MarketProvider from '@/components/MarketProvider'

export default function AppProviders({
  children,
  session,
}: {
  children: React.ReactNode
  session?: SessionProviderProps['session']
}) {
  return (
    <SessionProvider session={session}>
      <CountryProvider>
        <MarketProvider>{children}</MarketProvider>
      </CountryProvider>
    </SessionProvider>
  )
}
