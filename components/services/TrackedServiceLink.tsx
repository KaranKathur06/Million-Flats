'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { trackEvent } from '@/lib/tracking'

type Props = ComponentProps<typeof Link> & {
  eventName: string
  eventParams?: Record<string, string | number | boolean | undefined>
}

export default function TrackedServiceLink({ eventName, eventParams, onClick, ...props }: Props) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        trackEvent(eventName, eventParams)
        onClick?.(event)
      }}
    />
  )
}