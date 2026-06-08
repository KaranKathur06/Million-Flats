'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  lat: number
  lng: number
  className?: string
}

export default function LazyMap({ lat, lng, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [shouldRender, setShouldRender] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting)
        if (hit) {
          setShouldRender(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const safeLat = Number.isFinite(lat) ? lat : 0
  const safeLng = Number.isFinite(lng) ? lng : 0
  const heightClass = className && className.trim().length > 0 ? className : 'h-[240px]'

  return (
    <div ref={ref}>
      {shouldRender ? (
        <iframe
          title="Project location"
          loading="lazy"
          className={`w-full ${heightClass}`}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(`${safeLat},${safeLng}`)}&z=15&output=embed`}
        />
      ) : (
        <div className={`w-full ${heightClass} bg-gray-100 animate-pulse`} />
      )}
    </div>
  )
}
