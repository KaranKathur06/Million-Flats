'use client'

import { useMemo, useState } from 'react'

type Props = {
  amenities: string[]
  maxPreview?: number
}

function normalizeAmenity(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default function AmenitiesListModal({ amenities, maxPreview = 8 }: Props) {
  const [expanded, setExpanded] = useState(false)

  const safeAmenities = useMemo(() => {
    if (!Array.isArray(amenities)) return []
    const out: string[] = []
    const seen = new Set<string>()
    for (const a of amenities) {
      const s = normalizeAmenity(a)
      if (!s) continue
      const key = s.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(s)
    }
    return out
  }, [amenities])

  const preview = expanded ? safeAmenities : safeAmenities.slice(0, Math.max(0, maxPreview))
  const hasMore = safeAmenities.length > maxPreview

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
        {preview.map((name) => (
          <div key={name} className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-100 text-dark-blue">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path
                  fillRule="evenodd"
                  d="M16.704 5.29a1 1 0 01.006 1.414l-7.2 7.3a1 1 0 01-1.42.003L3.29 9.19a1 1 0 011.42-1.406l3.07 3.106 6.493-6.59a1 1 0 011.421-.01z"
                  clipRule="evenodd"
                />
              </svg>
            </span>
            <span className="text-sm text-charcoal leading-snug">{name}</span>
          </div>
        ))}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="mt-5 inline-flex text-sm font-semibold text-dark-blue hover:underline"
        >
          {expanded ? 'Show fewer amenities' : 'View all amenities'}
        </button>
      ) : null}

    </div>
  )
}
