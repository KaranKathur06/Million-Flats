'use client'

import { useState } from 'react'
import { getImageProps } from 'next/image'

type Props = {
  desktopImage: string | null
  mobileImage?: string | null
  desktopAlt: string
  mobileAlt?: string
  fallbackImage?: string | null
  className?: string
}

export default function HeroBannerBackdrop({ desktopImage, mobileImage, desktopAlt, mobileAlt, fallbackImage = null, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const [fallbackFailed, setFallbackFailed] = useState(false)
  const primaryImage = failed ? null : desktopImage
  const desktopSrc = primaryImage || (!fallbackFailed ? fallbackImage : null)
  const mobileSrc = primaryImage && mobileImage && mobileImage !== primaryImage ? mobileImage : desktopSrc

  if (!desktopSrc) return null

  const desktopProps = getImageProps({
    src: desktopSrc,
    alt: desktopAlt,
    fill: true,
    priority: true,
    sizes: '100vw',
    className,
  }).props
  const mobileProps = mobileSrc && mobileSrc !== desktopSrc
    ? getImageProps({ src: mobileSrc, alt: mobileAlt || desktopAlt, fill: true, priority: true, sizes: '100vw', className }).props
    : null
  const desktopMedia = mobileProps ? '(min-width: 768px)' : undefined
  const mobileMedia = mobileProps ? '(max-width: 767px)' : undefined

  return <>
    <link rel="preload" as="image" href={desktopProps.src} imageSrcSet={desktopProps.srcSet} imageSizes={desktopProps.sizes} media={desktopMedia} fetchPriority="high" />
    {mobileProps ? <link rel="preload" as="image" href={mobileProps.src} imageSrcSet={mobileProps.srcSet} imageSizes={mobileProps.sizes} media={mobileMedia} fetchPriority="high" /> : null}
    <picture className="absolute inset-0 block">
      {mobileProps ? <source media={mobileMedia} srcSet={mobileProps.srcSet} sizes={mobileProps.sizes} /> : null}
      <img
        {...desktopProps}
        alt={desktopAlt}
        onError={() => {
          if (!failed && desktopImage) setFailed(true)
          else setFallbackFailed(true)
        }}
      />
    </picture>
  </>
}