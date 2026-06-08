/** CRM / analytics events for 3D Tour demo landing funnel */

export const THREE_D_TOUR_EVENTS = {
  PAGE_VISIT: '3D_TOUR_DEMO_PAGE_VISIT',
  STEP_REACHED: '3D_TOUR_DEMO_STEP',
  FORM_ABANDONED: '3D_TOUR_DEMO_ABANDONED',
  SUBMISSION_COMPLETED: '3D_TOUR_DEMO_SUBMITTED',
} as const

export function trackThreeDTourEvent(
  name: string,
  payload?: Record<string, unknown>,
) {
  if (typeof window === 'undefined') return
  void fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name,
      path: window.location.pathname,
      payload: { ...payload, funnel: '3D_TOUR_DEMO', at: new Date().toISOString() },
    }),
  }).catch(() => null)
}
