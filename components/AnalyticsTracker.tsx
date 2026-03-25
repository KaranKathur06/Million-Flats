'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/tracking'

/**
 * AnalyticsTracker - Handles SPA page view tracking
 * Mount this ONCE in the root layout
 * Triggers exactly ONE page view per route change
 */
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return

    // Build full URL with query params
    const query = searchParams?.toString()
    const url = query ? `${pathname}?${query}` : pathname

    // Track page view - this handles both GA4 and Google Ads
    trackPageView(url)
  }, [pathname, searchParams])

  return null
}
