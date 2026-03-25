'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { GOOGLE_ADS_ID, trackHighValuePage } from '@/lib/analytics'

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
  const gaMeasurementId =
    safeMeasurementId(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID) ||
    safeMeasurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) ||
    'G-H8SYDHT9FB'

  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Track page views on route changes
  useEffect(() => {
    if (!isProd) return
    if (typeof window === 'undefined') return
    if (typeof window.gtag !== 'function') return

    const query = searchParams?.toString()
    const pagePath = query ? `${pathname}?${query}` : pathname

    // GA4 page view
    window.gtag('event', 'page_view', {
      page_path: pagePath,
    })

    // Google Ads page view
    window.gtag('config', GOOGLE_ADS_ID, {
      page_path: pagePath,
    })

    // Track high-value pages with custom events
    if (pathname) {
      trackHighValuePage(pathname)
    }
  }, [isProd, gaMeasurementId, pathname, searchParams])

  if (!isProd) return null
  if (!gaMeasurementId) return null

  return (
    <>
      {/* Google Analytics (GA4) script */}
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`} strategy="afterInteractive" />
      {/* Combined initialization for GA4 and Google Ads */}
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${gaMeasurementId}', { send_page_view: false });
          gtag('config', '${GOOGLE_ADS_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
