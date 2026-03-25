'use client'

import Script from 'next/script'
import { GOOGLE_ADS_ID, GA4_MEASUREMENT_ID } from '@/lib/tracking'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/**
 * GoogleAnalytics - Script loader ONLY
 * Loads gtag.js once and initializes both GA4 and Google Ads
 * All tracking is handled by AnalyticsTracker component
 */
export default function GoogleAnalytics() {
  const isProd = process.env.NODE_ENV === 'production'

  if (!isProd) return null

  return (
    <>
      {/* Load gtag.js script */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_ADS_ID)}`}
        strategy="afterInteractive"
      />
      {/* Initialize both GA4 and Google Ads with automatic page views disabled */}
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA4_MEASUREMENT_ID}', { send_page_view: false });
          gtag('config', '${GOOGLE_ADS_ID}', { send_page_view: false });
        `}
      </Script>
    </>
  )
}
