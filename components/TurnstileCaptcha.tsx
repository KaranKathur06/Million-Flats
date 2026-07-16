'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, any>) => void
      reset: (widgetId: string) => void
    }
  }
}

interface TurnstileCaptchaProps {
  siteKey?: string
  requireCaptcha: boolean
  onVerify: (token: string) => void
  onExpire?: () => void
}

const SCRIPT_ID = 'turnstile-script'
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window unavailable'))
    if (window.turnstile) return resolve()
    if (document.getElementById(SCRIPT_ID)) {
      const existing = document.getElementById(SCRIPT_ID)
      existing?.addEventListener('load', () => resolve())
      existing?.addEventListener('error', () => reject(new Error('Failed to load Turnstile script')))
      return
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Turnstile script'))
    document.head.appendChild(script)
  })
}

export default function TurnstileCaptcha({ siteKey, requireCaptcha, onVerify, onExpire }: TurnstileCaptchaProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const [widgetId, setWidgetId] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!requireCaptcha || !siteKey) return
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled) return
        setScriptLoaded(true)
      })
      .catch((err) => {
        console.error('[TurnstileCaptcha] script load failed', err)
        setError('Unable to load captcha. Please try again later.')
      })

    return () => {
      cancelled = true
    }
  }, [requireCaptcha, siteKey])

  useEffect(() => {
    if (!requireCaptcha || !siteKey || !scriptLoaded || !rootRef.current) return
    if (!window.turnstile) {
      setError('Captcha service unavailable.')
      return
    }

    const container = rootRef.current
    const id = window.turnstile.render(container, {
      sitekey: siteKey,
      theme: 'light',
      callback: (token: string) => {
        onVerify(token)
      },
      'expired-callback': () => {
        if (onExpire) onExpire()
      },
      'error-callback': () => {
        setError('Captcha verification failed. Please retry.')
      },
      action: 'submit',
    })

    setWidgetId(String(id))

    return () => {
      if (widgetId && window.turnstile?.reset) {
        window.turnstile.reset(widgetId)
      }
    }
  }, [requireCaptcha, siteKey, scriptLoaded, onVerify, onExpire, widgetId])

  if (!requireCaptcha) return null

  if (!siteKey) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Captcha is required for this request, but no site key is configured. Set `NEXT_PUBLIC_TURNSTILE_SITEKEY` to enable.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div ref={rootRef} />
      {error && <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    </div>
  )
}
