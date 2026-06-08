'use client'

import Image from 'next/image'
import { useState } from 'react'

type Props = {
  src: string
  alt: string
  size?: number
}

export default function TeamMemberAvatar({ src, alt, size = 112 }: Props) {
  const [currentSrc, setCurrentSrc] = useState(src)

  return (
    <div
      className="mx-auto mb-5 rounded-full bg-gray-100 overflow-hidden shadow-sm"
      style={{ height: size, width: size }}
    >
      <Image
        src={currentSrc}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full object-cover"
        onError={() => setCurrentSrc('/image-placeholder.svg')}
        priority={false}
      />
    </div>
  )
}
