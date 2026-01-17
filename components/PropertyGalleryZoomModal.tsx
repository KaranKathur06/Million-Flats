'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

type Props = {
  src: string
  title: string
  index: number
  total: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
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

export default function PropertyGalleryZoomModal({ src, title, index, total, onClose, onNext, onPrev }: Props) {
  const [zoomScale, setZoomScale] = useState(1)

  const zoomIn = () => setZoomScale((s) => Math.min(4, Math.round((s + 0.25) * 100) / 100))
  const zoomOut = () => setZoomScale((s) => Math.max(1, Math.round((s - 0.25) * 100) / 100))
  const zoomReset = () => setZoomScale(1)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev()
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext()
        return
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        zoomIn()
        return
      }
      if (e.key === '-') {
        e.preventDefault()
        zoomOut()
        return
      }
      if (e.key === '0') {
        e.preventDefault()
        zoomReset()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, onNext, onPrev])

  useEffect(() => {
    setZoomScale(1)
  }, [src])

  return (
    <div className="fixed inset-0 z-50 bg-black/85" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="absolute inset-x-0 top-0 px-4 py-3 flex items-center justify-between text-white">
        <div className="text-sm opacity-90">
          {index + 1} / {total}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              zoomOut()
            }}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2"
          >
            −
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              zoomIn()
            }}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2"
          >
            +
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              zoomReset()
            }}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="absolute inset-0 pt-14 pb-8 px-4 flex items-center justify-center"
        onClick={onClose}
        onWheel={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (e.deltaY < 0) zoomIn()
          else zoomOut()
        }}
      >
        <div
          className="relative w-full max-w-[1400px] h-[78vh]"
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `scale(${zoomScale})`, transformOrigin: 'center center' }}
        >
          <Image
            src={src}
            alt={title}
            fill
            className="object-contain"
            sizes="100vw"
            unoptimized={src.startsWith('http') && !canOptimizeUrl(src)}
            priority
          />
        </div>
      </div>

      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPrev()
            }}
            aria-label="Previous image"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 text-white w-12 h-12 flex items-center justify-center"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onNext()
            }}
            aria-label="Next image"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 text-white w-12 h-12 flex items-center justify-center"
          >
            <span className="text-2xl leading-none">›</span>
          </button>
        </>
      ) : null}
    </div>
  )
}
