'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { FAQ_POPUP_LAST_SEEN_KEY } from '@/lib/leadMagnets/constants'
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
  const raw = window.localStorage.getItem(FAQ_POPUP_LAST_SEEN_KEY)
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
    if (status !== 'unauthenticated') return
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
      trackLeadMagnetEvent('popup_view', { slug: leadMagnet.slug, source: 'faq_popup' })
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
  }, [status, isAuthRoute, leadMagnet, loadingConfig])

  useEffect(() => {
    if (!isOpen) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        trackLeadMagnetEvent('popup_close', { slug: leadMagnet?.slug || '', reason: 'esc' })
      }
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isOpen, leadMagnet?.slug])

  if (!leadMagnet || status !== 'unauthenticated' || isAuthRoute) return null
  const magnet = leadMagnet

  async function handleDownload() {
    setError('')
    setLoading(true)

    await trackLeadMagnetEvent('download_click', { slug: magnet.slug, source: 'faq_popup' })

    savePostLoginAction({
      type: 'lead_magnet_download',
      slug: magnet.slug,
      source: 'faq_popup',
      createdAt: Date.now(),
    })

    await trackLeadMagnetEvent('login_required', { slug: magnet.slug, source: 'faq_popup' })

    const nextPath = pathname || '/'
    router.push(`/auth/user/login?next=${encodeURIComponent(nextPath)}`)
  }

  const closePopup = async (reason: string) => {
    setIsOpen(false)
    await trackLeadMagnetEvent('popup_close', { slug: magnet.slug, reason })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-slate-950/45" onClick={() => closePopup('outside_click')} />
      <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
        <section className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="relative overflow-hidden border-b border-gray-100 p-5 sm:p-6">
            <button
              type="button"
              onClick={() => closePopup('close_button')}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close popup"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-dark-blue/10 via-transparent to-transparent" />
            <div className="relative">
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
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-dark-blue px-5 text-sm font-semibold text-white transition hover:bg-dark-blue/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Redirecting to login...' : magnet.ctaLabel || 'Download Free Guide'}
            </button>
            <p className="mt-2 text-center text-xs text-gray-500">{magnet.loginHint || 'Login required'}</p>
            {error ? (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
