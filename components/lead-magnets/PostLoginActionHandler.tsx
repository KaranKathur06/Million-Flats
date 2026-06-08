'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import {
  POST_LOGIN_ACTION_KEY,
  POST_LOGIN_ACTION_LOCK_KEY,
  type PostLoginAction,
} from '@/lib/leadMagnets/constants'
import {
  clearPostLoginAction,
  getPostLoginAction,
  trackLeadMagnetEvent,
} from '@/lib/leadMagnets/client'

function safeParseAction(raw: string | null): PostLoginAction | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PostLoginAction
    if (parsed?.type !== 'lead_magnet_download') return null
    if (!parsed.slug || typeof parsed.slug !== 'string') return null
    if (parsed.createdAt && Date.now() - Number(parsed.createdAt) > 7 * 24 * 60 * 60 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

export default function PostLoginActionHandler() {
  const { status } = useSession()
  const runningRef = useRef(false)
  const tabIdRef = useRef<string>(`tab-${Math.random().toString(36).slice(2)}`)

  useEffect(() => {
    if (status !== 'authenticated') return

    const run = async () => {
      if (runningRef.current) return
      runningRef.current = true

      try {
        const action = getPostLoginAction()
        if (!action || action.type !== 'lead_magnet_download' || !action.slug) return

        const now = Date.now()
        const lockRaw = window.localStorage.getItem(POST_LOGIN_ACTION_LOCK_KEY)
        if (lockRaw) {
          try {
            const lock = JSON.parse(lockRaw) as { tabId: string; at: number }
            if (lock && lock.tabId && lock.tabId !== tabIdRef.current && now - Number(lock.at || 0) < 15000) {
              return
            }
          } catch {
            // ignore stale lock parse errors
          }
        }

        window.localStorage.setItem(
          POST_LOGIN_ACTION_LOCK_KEY,
          JSON.stringify({ tabId: tabIdRef.current, at: now })
        )

        const res = await fetch(`/api/lead-magnets/${encodeURIComponent(action.slug)}/download?source=${encodeURIComponent(action.source || 'post_login')}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        })

        const data = await res.json().catch(() => null)
        if (!res.ok || !data?.download_url) {
          if (res.status === 404 || res.status === 400) {
            clearPostLoginAction()
          }
          return
        }

        window.open(data.download_url, '_blank', 'noopener,noreferrer')
        await trackLeadMagnetEvent('download_success', { slug: action.slug, source: action.source || 'post_login' })
        clearPostLoginAction()
      } finally {
        const lockRaw = window.localStorage.getItem(POST_LOGIN_ACTION_LOCK_KEY)
        if (!lockRaw || (lockRaw && lockRaw.includes(tabIdRef.current))) {
          window.localStorage.removeItem(POST_LOGIN_ACTION_LOCK_KEY)
        }
        runningRef.current = false
      }
    }

    run()
  }, [status])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== POST_LOGIN_ACTION_KEY) return
      if (status !== 'authenticated') return

      const action = safeParseAction(event.newValue)
      if (!action) return

      window.setTimeout(() => {
        const current = getPostLoginAction()
        if (!current) return
        if (runningRef.current) return
        void fetch(`/api/lead-magnets/${encodeURIComponent(current.slug)}/download?source=post_login_sync`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        })
          .then((r) => r.json())
          .then((d) => {
            if (d?.download_url) {
              window.open(d.download_url, '_blank', 'noopener,noreferrer')
              clearPostLoginAction()
            }
          })
          .catch(() => null)
      }, 120)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [status])

  return null
}
