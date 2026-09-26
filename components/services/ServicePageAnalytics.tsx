'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/tracking'

export default function ServicePageAnalytics({ segment }: { segment: 'developers' | 'agencies' | 'agents' }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    const eventName = {
      developers: 'developer_plan_view',
      agencies: 'agency_plan_view',
      agents: 'agent_plan_view',
    }[segment]
    trackEvent(eventName)
  }, [segment])

  return null
}