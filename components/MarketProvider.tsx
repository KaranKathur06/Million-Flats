'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/lib/country'

interface MarketContextValue {
  market: CountryCode
  setMarket: (market: CountryCode) => void
}

const MarketContext = createContext<MarketContextValue | undefined>(undefined)

const STORAGE_KEY = 'millionflats.market'

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) {
    throw new Error('useMarket must be used within MarketProvider')
  }
  return ctx
}

export default function MarketProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarketState] = useState<CountryCode>(DEFAULT_COUNTRY)

  useEffect(() => {
    try {
      const fromUrl = new URLSearchParams(window.location.search).get('market')
      if (fromUrl && isCountryCode(fromUrl)) {
        setMarketState(fromUrl)
        window.localStorage.setItem(STORAGE_KEY, fromUrl)
        return
      }

      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored && isCountryCode(stored)) {
        setMarketState(stored)
      }
    } catch {
      // noop
    }
  }, [])

  const setMarket = (next: CountryCode) => {
    setMarketState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // noop
    }
  }

  const value = useMemo(() => ({ market, setMarket }), [market])

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>
}
