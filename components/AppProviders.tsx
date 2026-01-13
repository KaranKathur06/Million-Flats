'use client'

import React from 'react'
import { SessionProvider } from 'next-auth/react'
import CountryProvider from '@/components/CountryProvider'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CountryProvider>{children}</CountryProvider>
    </SessionProvider>
  )
}
