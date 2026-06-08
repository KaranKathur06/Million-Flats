'use client'

import { useMemo, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { isCountryCode, type CountryCode } from '@/lib/country'
import { useCountry } from '@/components/CountryProvider'

export default function FeaturedCountryToggle({ country }: { country: CountryCode }) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const searchParams = useSearchParams()
  const { setCountry } = useCountry()

  const [pending, startTransition] = useTransition()

  const current = useMemo<CountryCode>(() => {
    const fromUrl = searchParams?.get('country')
    if (fromUrl && isCountryCode(fromUrl)) return fromUrl
    return country
  }, [country, searchParams])

  const set = (next: CountryCode) => {
    if (next === current) return

    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('country', next)

    setCountry(next)

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  const pill = (label: string, value: CountryCode) => {
    const active = current === value
    const base =
      'inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition-all select-none'

    const cls = active
      ? `${base} bg-dark-blue text-white shadow-sm`
      : `${base} bg-white text-dark-blue border border-gray-200 hover:bg-gray-50`

    return (
      <button type="button" onClick={() => set(value)} disabled={pending} className={cls}>
        {label}
      </button>
    )
  }

  return (
    <div className="w-full flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-gray-700">Featured</div>
        <div className="text-xs text-gray-500">Switch country to refresh all featured modules.</div>
      </div>

      <div className="inline-flex items-center rounded-full bg-gray-100 p-1 gap-1">
        {pill('UAE', 'UAE')}
        {pill('INDIA', 'INDIA')}
      </div>
    </div>
  )
}
