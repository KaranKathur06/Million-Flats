'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FAQ_POPUP_LAST_CLOSED_KEY, FAQ_POPUP_LAST_SEEN_KEY } from '@/lib/leadMagnets/constants'
import { savePostLoginAction, trackLeadMagnetEvent } from '@/lib/leadMagnets/client'

type PopupLeadMagnet = {
  id: string
  slug: string
  title: string
  subtitle: string | null
  ctaLabel: string
  loginHint: string
  badgeText: string | null
  cooldownHours: number
  popupDelaySeconds: number
  popupScrollPercent: number
}

function hasCooldown(hours: number) {
  if (typeof window === 'undefined') return true
  const raw = window.localStorage.getItem(FAQ_POPUP_LAST_CLOSED_KEY) ?? window.localStorage.getItem(FAQ_POPUP_LAST_SEEN_KEY)
  if (!raw) return false
  const seenAt = Number(raw)
  if (!Number.isFinite(seenAt)) return false
  return Date.now() - seenAt < hours * 60 * 60 * 1000
}

export default function DownloadGatePopup() {
  const { status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [leadMagnet, setLeadMagnet] = useState<PopupLeadMagnet | null>(null)
  const [loadingConfig, setLoadingConfig] = useState(true)

  const isAuthRoute = useMemo(() => {
    const p = pathname || ''
    return p.startsWith('/auth') || p.startsWith('/user/login') || p.startsWith('/user/register')
  }, [pathname])

  const canAttemptPopup = status === 'authenticated' || status === 'unauthenticated'
  const isLoggedIn = status === 'authenticated'

  useEffect(() => {
    let canceled = false
    async function loadConfig() {
      try {
        const res = await fetch('/api/lead-magnets/public', { cache: 'no-store' })
        const json = await res.json().catch(() => null)
        if (canceled) return
        if (res.ok && json?.success && json?.data) {
          setLeadMagnet(json.data)
        }
      } catch {
        // noop
      } finally {
        if (!canceled) setLoadingConfig(false)
      }
    }
    loadConfig()
    return () => {
      canceled = true
    }
  }, [])

  useEffect(() => {
    if (!canAttemptPopup) return
    if (isAuthRoute) return
    if (loadingConfig) return
    if (!leadMagnet) return
    if (hasCooldown(leadMagnet.cooldownHours || 24)) return

    let shown = false

    const openPopup = () => {
      if (shown) return
      shown = true
      setIsOpen(true)
      window.localStorage.setItem(FAQ_POPUP_LAST_SEEN_KEY, String(Date.now()))
      trackLeadMagnetEvent('popup_view', {
        slug: leadMagnet.slug,
        source: isLoggedIn ? 'faq_popup_authenticated' : 'faq_popup_guest',
      })
    }

    const timer = window.setTimeout(openPopup, Math.max(1000, (leadMagnet.popupDelaySeconds || 4) * 1000))

    const onScroll = () => {
      if (shown) return
      const doc = document.documentElement
      const scrollTop = doc.scrollTop || document.body.scrollTop || 0
      const maxScrollable = Math.max(1, doc.scrollHeight - doc.clientHeight)
      const percent = (scrollTop / maxScrollable) * 100
      if (percent >= (leadMagnet.popupScrollPercent || 25)) {
        openPopup()
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [canAttemptPopup, isAuthRoute, isLoggedIn, leadMagnet, loadingConfig])

  useEffect(() => {
    if (!isOpen) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        void closePopup('esc')
      }
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isOpen])

  if (!leadMagnet || !canAttemptPopup || isAuthRoute) return null
  const magnet = leadMagnet

  async function handleDownload() {
    setError('')
    setLoading(true)

    await trackLeadMagnetEvent('download_click', {
      slug: magnet.slug,
      source: isLoggedIn ? 'faq_popup_authenticated' : 'faq_popup_guest',
    })

    if (isLoggedIn) {
      try {
        const res = await fetch(`/api/lead-magnets/${encodeURIComponent(magnet.slug)}/download?source=faq_popup_authenticated`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        })
        const data = await res.json().catch(() => null)

        if (res.status === 401) {
          savePostLoginAction({
            type: 'lead_magnet_download',
            slug: magnet.slug,
            source: 'faq_popup_authenticated',
            createdAt: Date.now(),
          })
          const nextPath = pathname || '/'
          router.push(`/auth/user/login?next=${encodeURIComponent(nextPath)}`)
          return
        }

        if (!res.ok || !data?.download_url) {
          throw new Error(data?.message || 'Download failed')
        }

        window.open(data.download_url, '_blank', 'noopener,noreferrer')
        setIsOpen(false)
        await trackLeadMagnetEvent('download_success', { slug: magnet.slug, source: 'faq_popup_authenticated' })
        return
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Download failed. Try again.')
        return
      } finally {
        setLoading(false)
      }
    }

    savePostLoginAction({
      type: 'lead_magnet_download',
      slug: magnet.slug,
      source: 'faq_popup_guest',
      createdAt: Date.now(),
    })

    await trackLeadMagnetEvent('login_required', { slug: magnet.slug, source: 'faq_popup_guest' })

    const nextPath = pathname || '/'
    router.push(`/auth/user/login?next=${encodeURIComponent(nextPath)}`)
  }

  async function closePopup(reason: string) {
    const closedAt = Date.now()
    window.localStorage.setItem(FAQ_POPUP_LAST_CLOSED_KEY, String(closedAt))
    window.localStorage.setItem(FAQ_POPUP_LAST_SEEN_KEY, String(closedAt))
    setIsOpen(false)
    await trackLeadMagnetEvent('popup_close', { slug: magnet.slug, reason })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/45 p-4 sm:p-6"
      onClick={() => void closePopup('outside_click')}
    >
      <section
        className="relative z-[9999] w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl pointer-events-auto"
        onClick={(event) => event.stopPropagation()}
      >
          <div className="relative overflow-hidden border-b border-gray-100 p-5 sm:p-6">
            <div className="absolute right-2 top-2 z-[10001] p-2">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  void closePopup('close_button')
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-transparent text-gray-600 transition hover:bg-gray-100 hover:text-gray-900 active:scale-95 cursor-pointer touch-manipulation"
                aria-label="Close"
              >
                <span className="pointer-events-none text-2xl leading-none">&times;</span>
              </button>
            </div>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-dark-blue/10 via-transparent to-transparent" />
            <div className="relative pr-12">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">{magnet.badgeText || 'Exclusive Guide'}</p>
              <h3 className="mt-2 text-2xl font-bold tracking-tight text-dark-blue">{magnet.title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {magnet.subtitle || 'Avoid costly mistakes in Dubai real estate. Get insider insights used by top investors.'}
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 sm:pt-5">
            <button
              type="button"
              disabled={loading}
              onClick={handleDownload}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-dark-blue px-5 text-sm font-semibold text-white transition hover:bg-dark-blue/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (isLoggedIn ? 'Preparing secure download...' : 'Redirecting to login...') : isLoggedIn ? 'Download Now' : magnet.ctaLabel || 'Login to Download'}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">
              {isLoggedIn ? 'Secure signed link will open in a new tab.' : magnet.loginHint || 'Login required'}
            </p>
            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => void closePopup('maybe_later')}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-gray-200 px-5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800 active:scale-[0.98] cursor-pointer touch-manipulation"
            >
              Maybe Later
            </button>
          </div>
      </section>
    </div>
  )
}
