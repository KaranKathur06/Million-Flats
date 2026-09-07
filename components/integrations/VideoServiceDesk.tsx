'use client'

import Script from 'next/script'

const VIDEO_SERVICE_DESK_SRC = 'https://cdn.videoservicedesk.com/vsd.js'
const DEFAULT_VIDEO_SERVICE_DESK_TOKEN = 'rpm2xd'

function isEnabled() {
  return (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_VIDEOSERVICEDESK_ENABLED === 'true'
  )
}

export default function VideoServiceDesk() {
  const token = process.env.NEXT_PUBLIC_VIDEOSERVICEDESK_TOKEN || DEFAULT_VIDEO_SERVICE_DESK_TOKEN

  if (!isEnabled()) return null

  return (
    <Script
      id="videoservicedesk-script"
      src={VIDEO_SERVICE_DESK_SRC}
      data-token={token}
      strategy="afterInteractive"
      onLoad={() => {
        window.dispatchEvent(new Event('videoservicedesk:loaded'))
      }}
      onError={() => {
        window.dispatchEvent(new Event('videoservicedesk:error'))
      }}
    />
  )
}