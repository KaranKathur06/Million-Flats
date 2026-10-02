'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { trackEvent } from '@/lib/tracking'

declare global {
  interface Window {
    Wistia?: any
  }
}

type Props = {
  title?: string
  ariaLabel?: string
}

export default function MetaDologyVideoSection({
  title = 'Meta-dology Presentation | MillionFlats',
  ariaLabel = 'Meta-dology presentation video',
}: Props) {
  const wistiaEmbed = useMemo(() => '29zdny70mp', [])
  const [videoRequested, setVideoRequested] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (!videoRequested) return
    const iframe = iframeRef.current
    if (!iframe) return

    // Minimal postMessage handling (best-effort). Wistia supports player events
    // but message formats can vary; we keep it tolerant.
    const handler = (event: MessageEvent) => {
      const data = event.data
      if (!data) return

      const msg = typeof data === 'string' ? data : data?.type || data?.event || data?.name
      const normalized = String(msg || '').toLowerCase()

      if (normalized.includes('play')) trackEvent('video_played', { video_source: 'meta_dology_wistia' })
      if (normalized.includes('complete') || normalized.includes('ended'))
        trackEvent('video_completed', { video_source: 'meta_dology_wistia' })
      if (normalized.includes('fullscreen')) trackEvent('video_fullscreen', { video_source: 'meta_dology_wistia' })
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [videoRequested])

  const wistiaSrc = `https://fast.wistia.net/embed/iframe/${wistiaEmbed}`

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0d1f38]"
      aria-label={ariaLabel}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight leading-[1.1] mb-4">
            MillionFlats unifies AI, verified digital twins, and data intelligence through Meta-dology™.
          </h2>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            {videoRequested ? (
              <iframe
                ref={iframeRef}
                title={title}
                aria-label={ariaLabel}
                src={wistiaSrc}
                allow="picture-in-picture; autoplay; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => {
                  if (videoLoaded) return
                  setVideoLoaded(true)
                  trackEvent('video_loaded', { video_source: 'meta_dology_wistia' })
                }}
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <button
                type="button"
                aria-label="Load Meta-dology presentation video"
                onClick={() => setVideoRequested(true)}
                className="absolute inset-0 flex items-center justify-center bg-black"
              >
                <Image
                  src="/meta-dology-poster.webp"
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 1024px"
                  quality={80}
                  className="object-cover"
                />
                <span className="absolute inset-0 bg-black/25 transition-colors hover:bg-black/10" />
                <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#0d1f38] shadow-xl">
                  <Play size={26} fill="currentColor" aria-hidden="true" />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
