'use client'

import React from 'react'
import CountryProvider from '@/components/CountryProvider'

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return <CountryProvider>{children}</CountryProvider>
}
