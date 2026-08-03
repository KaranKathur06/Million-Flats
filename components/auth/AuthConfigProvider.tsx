'use client'

/**
 * AuthConfigProvider.tsx
 *
 * React Context provider that exposes the current authentication configuration
 * to all components. Fetches from /api/auth/config and subscribes to real-time
 * changes via SSE (/api/auth/config/stream).
 *
 * Usage:
 *   <AuthConfigProvider>
 *     <Header /> ← reads useAuthConfig()
 *   </AuthConfigProvider>
 *
 *   const { activeMode, allowWhatsapp, allowEmail, isLoading } = useAuthConfig()
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthConfig {
  activeMode: 'EMAIL_ONLY' | 'WHATSAPP_ONLY' | 'EMAIL_AND_WHATSAPP' | 'DISABLED'
  allowEmail: boolean
  allowWhatsapp: boolean
  allowGoogle: boolean
  allowRegistration: boolean
  allowForgotPassword: boolean
  maintenanceMessage: string | null
}

interface AuthConfigContextValue extends AuthConfig {
  isLoading: boolean
  refresh: () => void
}

const DEFAULT_CONFIG: AuthConfig = {
  activeMode: 'WHATSAPP_ONLY',
  allowEmail: true,
  allowWhatsapp: true,
  allowGoogle: false,
  allowRegistration: true,
  allowForgotPassword: true,
  maintenanceMessage: null,
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthConfigContext = createContext<AuthConfigContextValue>({
  ...DEFAULT_CONFIG,
  isLoading: true,
  refresh: () => {},
})

export function useAuthConfig(): AuthConfigContextValue {
  return useContext(AuthConfigContext)
}

// ─── Provider ────────────────────────────────────────────────────────────────

export default function AuthConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AuthConfig>(DEFAULT_CONFIG)
  const [isLoading, setIsLoading] = useState(true)
  const sseRef = useRef<EventSource | null>(null)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/config', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setConfig(prev => {
          // Only update if something actually changed
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev
          return { ...DEFAULT_CONFIG, ...data }
        })
      }
    } catch {
      // Keep current config on network error
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  // SSE connection for real-time updates
  useEffect(() => {
    if (typeof window === 'undefined') return

    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    function connectSSE() {
      try {
        const eventSource = new EventSource('/api/auth/config/stream')
        sseRef.current = eventSource

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            setConfig(prev => {
              if (JSON.stringify(prev) === JSON.stringify(data)) return prev
              return { ...DEFAULT_CONFIG, ...data }
            })
          } catch {
            // Ignore malformed messages
          }
        }

        eventSource.onerror = () => {
          eventSource.close()
          sseRef.current = null
          // Retry SSE after 5 seconds; fallback to polling in the meantime
          retryTimeout = setTimeout(connectSSE, 5000)
        }
      } catch {
        // SSE not supported — fallback to polling
      }
    }

    connectSSE()

    // Fallback polling every 30 seconds (in case SSE disconnects)
    pollTimerRef.current = setInterval(fetchConfig, 30000)

    return () => {
      sseRef.current?.close()
      sseRef.current = null
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      if (retryTimeout) clearTimeout(retryTimeout)
    }
  }, [fetchConfig])

  const value: AuthConfigContextValue = {
    ...config,
    isLoading,
    refresh: fetchConfig,
  }

  return (
    <AuthConfigContext.Provider value={value}>
      {children}
    </AuthConfigContext.Provider>
  )
}
