'use client'

import { useMemo, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { isCountryCode, type CountryCode } from '@/lib/country'
import { trackEvent } from '@/lib/analytics'
import { useMarket } from '@/components/MarketProvider'

const MARKETS: Array<{
  code: CountryCode
  label: string
}> = [
  {
    code: 'UAE',
    label: 'UAE',
  },
  {
    code: 'INDIA',
    label: 'INDIA',
  },
]

export default function GlobalMarketSelectorBar({ market }: { market: CountryCode }) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const searchParams = useSearchParams()
  const { setMarket } = useMarket()

  const [pending, startTransition] = useTransition()

  const current = useMemo<CountryCode>(() => {
    const fromUrl = searchParams?.get('market')
    if (fromUrl && isCountryCode(fromUrl)) return fromUrl
    return market
  }, [market, searchParams])

  const choose = (next: CountryCode) => {
    if (next === current) return

    const params = new URLSearchParams(searchParams?.toString() || '')
    params.set('market', next)

    setMarket(next)

    try {
      trackEvent('market_switch_event', {
        from_country: current,
        to_country: next,
        timestamp: new Date().toISOString(),
      })
    } catch {
      // noop
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="border-b border-gray-200 pb-6">
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-700">Featured</div>
            <div className="mt-1 text-base text-gray-500">Switch country to refresh all featured modules</div>
          </div>

          <div className="flex items-center justify-center mt-6 mb-8">
            <div className="inline-flex items-center gap-2 rounded-lg bg-white p-1 border border-[rgba(20,40,80,0.08)] shadow-[0_2px_8px_rgba(10,30,60,0.04)] min-w-[260px] justify-center">
              {MARKETS.map((m) => {
                const active = current === m.code
                const base =
                  'h-14 px-8 min-w-[120px] rounded-lg text-[16px] font-semibold tracking-wide transition-all duration-200 ease-in-out focus:outline-none'

                const cls = active
                  ? `${base} bg-[#1f3b63] text-white hover:bg-[#173252]`
                  : `${base} bg-transparent text-[#1f3b63] hover:bg-[rgba(31,59,99,0.06)]`

                return (
                  <button key={m.code} type="button" onClick={() => choose(m.code)} disabled={pending} className={cls}>
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
