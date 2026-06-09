'use client'

import { useState } from 'react'
import { fixImageUrl } from '@/lib/fixImageUrl'

type Props = {
  src?: string | null
  alt: string
  fallback: string
  className?: string
  loading?: 'lazy' | 'eager'
  objectFit?: 'cover' | 'contain'
}

/** Client image with CDN failsafe + graceful fallback on load error */
export default function ResolvedImage({
  src,
  alt,
  fallback,
  className = '',
  loading = 'lazy',
  objectFit = 'cover',
}: Props) {
  const [current, setCurrent] = useState(() => fixImageUrl(src, fallback))
  const [failed, setFailed] = useState(false)

  return (
    <img
      src={failed ? fallback : current}
      alt={alt}
      loading={loading}
      className={className}
      style={{ objectFit }}
      onError={() => {
        if (!failed) {
          setFailed(true)
          setCurrent(fallback)
        }
      }}
    />
  )
}
