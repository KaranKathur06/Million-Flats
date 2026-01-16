'use client'

import { useState } from 'react'
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

  if (!images || images.length === 0) {
    images = ['/image-placeholder.svg']
  }

  return (
    <div
      className={`${heightClassName || 'relative h-[280px] sm:h-[360px] md:h-[600px]'}${className ? ` ${className}` : ''}`}
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
          setSelectedImage((prev) => (prev + 1) % images.length)
        } else {
          setSelectedImage((prev) => (prev - 1 + images.length) % images.length)
        }
        setTouchStartX(null)
      }}
    >
      <Image
        src={images[selectedImage] || images[0]}
        alt={title}
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized={(images[selectedImage] || images[0]).startsWith('http')}
        loading="lazy"
      />
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setSelectedImage(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                selectedImage === index ? 'bg-white w-8' : 'bg-white/50'
              }`}
              aria-label={`View image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

