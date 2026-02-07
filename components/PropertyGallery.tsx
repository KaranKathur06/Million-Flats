'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'

interface PropertyGalleryProps {
  images: string[]
  title: string
  className?: string
  heightClassName?: string
}

export default function PropertyGallery({ images, title, className, heightClassName }: PropertyGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [zoomOpen, setZoomOpen] = useState(false)

  const ZoomModal = useMemo(
    () =>
      dynamic(() => import('./PropertyGalleryZoomModal'), {
        ssr: false,
      }),
    []
  )

  const canOptimizeUrl = useCallback((src: string) => {
    if (!src.startsWith('http')) return true
    try {
      const u = new URL(src)
      return u.hostname === 'api.reelly.io' || u.hostname === 'reelly-backend.s3.amazonaws.com' || u.hostname === 'images.unsplash.com'
    } catch {
      return false
    }
  }, [])

  const isSafeImageSrc = useCallback((src: string) => {
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
  }, [])

  const safeImages = useMemo(() => {
    if (Array.isArray(images) && images.length > 0)
      return images
        .filter((u) => typeof u === 'string')
        .map((u) => u.trim())
        .filter((u) => isSafeImageSrc(u))
    return []
  }, [images, isSafeImageSrc])

  const galleryImages = safeImages.length > 0 ? safeImages : ['/image-placeholder.svg']
  const activeSrc = galleryImages[selectedImage] || galleryImages[0] || '/image-placeholder.svg'
  const nextSrc = galleryImages.length > 1 ? galleryImages[(selectedImage + 1) % galleryImages.length] : ''
  const prevSrc = galleryImages.length > 1 ? galleryImages[(selectedImage - 1 + galleryImages.length) % galleryImages.length] : ''

  useEffect(() => {
    if (selectedImage >= galleryImages.length) setSelectedImage(0)
  }, [galleryImages.length, selectedImage])

  useEffect(() => {
    if (!activeSrc || galleryImages.length <= 1) return
    const preload = (src: string) => {
      if (!src || !src.startsWith('http')) return
      if (!isSafeImageSrc(src)) return
      try {
        const img = new window.Image()
        img.decoding = 'async'
        img.src = src
      } catch {
        // ignore
      }
    }

    preload(nextSrc)
    preload(prevSrc)
  }, [activeSrc, galleryImages.length, isSafeImageSrc, nextSrc, prevSrc])

  const goNext = useCallback(() => {
    setSelectedImage((prev) => (prev + 1) % galleryImages.length)
  }, [galleryImages.length])

  const goPrev = useCallback(() => {
    setSelectedImage((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
  }, [galleryImages.length])

  const openZoom = () => {
    setZoomOpen(true)
  }

  const closeZoom = () => {
    setZoomOpen(false)
  }

  return (
    <div className={className ? className : ''}>
      <div
        className={heightClassName || 'relative h-[280px] sm:h-[360px] md:h-[600px]'}
        onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX == null) return
          const endX = e.changedTouches[0]?.clientX ?? touchStartX
          const delta = endX - touchStartX
          if (Math.abs(delta) < 50) {
            setTouchStartX(null)
            return
          }

          if (delta < 0) {
            setSelectedImage((prev) => (prev + 1) % galleryImages.length)
          } else {
            setSelectedImage((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)
          }
          setTouchStartX(null)
        }}
      >
        <Image
          src={activeSrc}
          alt={title}
          fill
          className="object-cover cursor-zoom-in"
          sizes="100vw"
          unoptimized={activeSrc.startsWith('http') && !canOptimizeUrl(activeSrc)}
          loading="eager"
          priority
          onClick={openZoom}
        />

        {galleryImages.length > 1 ? (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/35 text-white text-xs px-3 py-1 backdrop-blur-sm">
            {selectedImage + 1} / {galleryImages.length}
          </div>
        ) : null}
      </div>

      {galleryImages.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {galleryImages.map((src, idx) => {
            const isActive = idx === selectedImage
            return (
              <button
                key={src + idx}
                type="button"
                onClick={() => setSelectedImage(idx)}
                className={`relative shrink-0 h-14 w-20 rounded-lg overflow-hidden ${
                  isActive ? 'ring-2 ring-dark-blue ring-offset-2 ring-offset-white' : 'opacity-80 hover:opacity-100'
                }`}
                aria-label={`View image ${idx + 1}`}
              >
                <Image
                  src={src}
                  alt={`${title} thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized={src.startsWith('http') && !canOptimizeUrl(src)}
                />
              </button>
            )
          })}
        </div>
      ) : null}

      {zoomOpen ? (
        <ZoomModal
          src={activeSrc}
          title={title}
          index={selectedImage}
          total={galleryImages.length}
          onClose={closeZoom}
          onNext={goNext}
          onPrev={goPrev}
        />
      ) : null}
    </div>
  )
}

