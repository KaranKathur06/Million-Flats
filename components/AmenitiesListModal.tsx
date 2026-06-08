'use client'

import { useId, useMemo, useRef } from 'react'

type Props = {
  amenities: string[]
  maxPreview?: number
  title?: string
}

function normalizeAmenity(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default function AmenitiesListModal({ amenities, maxPreview = 8, title = 'Amenities' }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null)
  const titleId = useId()

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

  const preview = safeAmenities.slice(0, Math.max(0, maxPreview))
  const hasMore = safeAmenities.length > preview.length

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
          onClick={() => dialogRef.current?.showModal()}
          className="mt-5 inline-flex text-sm font-semibold text-dark-blue hover:underline"
        >
          View all amenities
        </button>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="backdrop:bg-black/40 rounded-2xl p-0 w-[min(720px,calc(100%-32px))]"
      >
        <div className="bg-white rounded-2xl shadow-xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <p id={titleId} className="text-lg font-serif font-semibold text-dark-blue">
              {title}
            </p>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-gray-50 text-gray-700"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {safeAmenities.map((name) => (
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

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  )
}
