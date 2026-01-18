'use client'

import { useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'

type Props = {
  title: string
  images: string[]
  imageAltPrefix?: string
  aspectClassName?: string
  fit?: 'cover' | 'contain'
}

function canOptimizeUrl(src: string) {
  if (!src.startsWith('http')) return true
  try {
    const u = new URL(src)
    return u.hostname === 'api.reelly.io' || u.hostname === 'reelly-backend.s3.amazonaws.com' || u.hostname === 'images.unsplash.com'
  } catch {
    return false
  }
}

function isSafeImageSrc(src: string) {
  if (typeof src !== 'string') return false
  const s = src.trim()
  if (!s) return false
  if (s.startsWith('/')) return true
  if (!s.startsWith('http')) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function ScrollableZoomGallery({
  title,
  images,
  imageAltPrefix,
  aspectClassName = 'aspect-[4/3]',
  fit = 'cover',
}: Props) {
  const [selected, setSelected] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)

  const ZoomModal = useMemo(
    () =>
      dynamic(() => import('./PropertyGalleryZoomModal'), {
        ssr: false,
      }),
    []
  )

  const safeImages = useMemo(() => {
    if (!Array.isArray(images)) return []
    return images
      .filter((u) => typeof u === 'string')
      .map((u) => u.trim())
      .filter((u) => isSafeImageSrc(u))
  }, [images])

  const galleryImages = safeImages.length > 0 ? safeImages : ['/image-placeholder.svg']
  const activeSrc = galleryImages[selected] || galleryImages[0] || '/image-placeholder.svg'

  const goNext = useCallback(() => {
    setSelected((i) => (i + 1) % galleryImages.length)
  }, [galleryImages.length])

  const goPrev = useCallback(() => {
    setSelected((i) => (i - 1 + galleryImages.length) % galleryImages.length)
  }, [galleryImages.length])

  const openZoom = () => setZoomOpen(true)
  const closeZoom = () => setZoomOpen(false)

  return (
    <div>
      <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {galleryImages.map((src, idx) => {
          const isActive = idx === selected
          const alt = `${imageAltPrefix || title} image ${idx + 1}`
          const unoptimized = src.startsWith('http') && !canOptimizeUrl(src)

          return (
            <button
              key={src + idx}
              type="button"
              onClick={() => setSelected(idx)}
              className={`shrink-0 w-[240px] sm:w-[280px] md:w-[320px] rounded-xl border overflow-hidden ${
                isActive ? 'border-dark-blue' : 'border-gray-200'
              }`}
            >
              <div className={`relative ${aspectClassName} bg-white`}>
                <Image
                  src={src}
                  alt={alt}
                  fill
                  className={fit === 'contain' ? 'object-contain' : 'object-cover'}
                  sizes="(max-width: 768px) 70vw, 320px"
                  unoptimized={unoptimized}
                />
                {isActive ? <div className="absolute inset-0 ring-2 ring-dark-blue ring-inset" /> : null}
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-gray-200 overflow-hidden">
        <div className="relative aspect-[16/9] bg-black/5">
          <Image
            src={activeSrc}
            alt={title}
            fill
            className={(fit === 'contain' ? 'object-contain' : 'object-cover') + ' cursor-zoom-in'}
            sizes="100vw"
            unoptimized={activeSrc.startsWith('http') && !canOptimizeUrl(activeSrc)}
            onClick={openZoom}
          />
          {galleryImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous image"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 hover:bg-black/55 text-white w-11 h-11 flex items-center justify-center backdrop-blur-sm"
              >
                <span className="text-2xl leading-none">‹</span>
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next image"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 hover:bg-black/55 text-white w-11 h-11 flex items-center justify-center backdrop-blur-sm"
              >
                <span className="text-2xl leading-none">›</span>
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={openZoom}
            className="absolute top-3 right-3 rounded-xl bg-black/35 hover:bg-black/55 text-white px-3 py-2 text-sm backdrop-blur-sm"
          >
            Zoom
          </button>
        </div>
      </div>

      {zoomOpen ? (
        <ZoomModal
          src={activeSrc}
          title={title}
          index={selected}
          total={galleryImages.length}
          onClose={closeZoom}
          onNext={goNext}
          onPrev={goPrev}
        />
      ) : null}
    </div>
  )
}
