'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/lib/country'

interface CountryContextValue {
  country: CountryCode
  setCountry: (country: CountryCode) => void
}

const CountryContext = createContext<CountryContextValue | undefined>(undefined)

const STORAGE_KEY = 'millionflats.country'

export function useCountry() {
  const ctx = useContext(CountryContext)
  if (!ctx) {
    throw new Error('useCountry must be used within CountryProvider')
  }
  return ctx
}

export default function CountryProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<CountryCode>(DEFAULT_COUNTRY)

  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const fromUrl = sp.get('market') || sp.get('country')
      if (fromUrl && isCountryCode(fromUrl)) {
        setCountryState(fromUrl)
        window.localStorage.setItem(STORAGE_KEY, fromUrl)
        return
      }

      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored && isCountryCode(stored)) {
        setCountryState(stored)
      }
    } catch {
    }
  }, [])

  const setCountry = (next: CountryCode) => {
    setCountryState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }

  const value = useMemo(() => ({ country, setCountry }), [country])

  return <CountryContext.Provider value={value}>{children}</CountryContext.Provider>
}
