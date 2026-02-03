'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: any[]) => void
  }
}

function safeMeasurementId(value: unknown) {
  const s = typeof value === 'string' ? value.trim() : ''
  return s
}

export default function GoogleAnalytics() {
  const isProd = process.env.NODE_ENV === 'production'
  const measurementId =
    safeMeasurementId(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID) ||
    safeMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) ||
    'G-H8SYDHT9FB'

  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!isProd) return
    if (!measurementId) return
    if (typeof window === 'undefined') return
    if (typeof window.gtag !== 'function') return

    const query = searchParams?.toString()
    const pagePath = query ? `${pathname}?${query}` : pathname

    window.gtag('event', 'page_view', {
      page_path: pagePath,
    })
  }, [isProd, measurementId, pathname, searchParams])

  if (!isProd) return null
  if (!measurementId) return null

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
