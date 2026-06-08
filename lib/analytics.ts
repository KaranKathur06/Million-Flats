/**
 * Analytics utility - re-exports from lib/tracking.ts
 * This file exists for backward compatibility
 * All tracking logic is centralized in lib/tracking.ts
 */

export {
  trackEvent,
  trackPageView,
  trackConversion,
  GOOGLE_ADS_ID,
  GA4_MEASUREMENT_ID,
  HIGH_VALUE_PAGES,
} from './tracking'
