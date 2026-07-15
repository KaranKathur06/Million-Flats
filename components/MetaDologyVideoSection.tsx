'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [videoLoaded, setVideoLoaded] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    const onLoaded = () => {
      if (!videoLoaded) {
        setVideoLoaded(true)
        trackEvent('video_loaded', { video_source: 'meta_dology_wistia' })
      }
    }

    // Fire "loaded" on next tick as we are using lazy iframe; this is lightweight
    const t = window.setTimeout(onLoaded, 50)
    return () => window.clearTimeout(t)
  }, [videoLoaded])

  useEffect(() => {
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
  }, [])

  const wistiaSrc = `https://fast.wistia.net/embed/iframe/${wistiaEmbed}`

  return (
    <section
      className="relative w-full overflow-hidden bg-[#0d1f38]"
      aria-label={ariaLabel}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-yellow" />
            <span className="text-accent-yellow/90 text-[10px] sm:text-[11px] font-bold tracking-[0.18em] uppercase">
              Meta-dology™
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-white tracking-tight leading-[1.1] mb-4">
            See how MillionFlats combines AI, Digital Twins, Verification, and Data Intelligence to transform modern real estate.
          </h2>

          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Meta-dology™ — a premium proof-first presentation experience built for enterprise real estate workflows.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.35)] border border-white/10 bg-black">
            <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
              <iframe
                ref={iframeRef}
                title={title}
                aria-label={ariaLabel}
                src={wistiaSrc}
                loading="lazy"
                allow="fullscreen; picture-in-picture; autoplay; encrypted-media"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 w-full h-full"
              />
            </div>
          </div>

          <div className="mt-6 text-center text-white/50 text-xs sm:text-sm">
            Learn more with the full Meta-dology presentation.
          </div>
        </div>
      </div>
    </section>
  )
}
