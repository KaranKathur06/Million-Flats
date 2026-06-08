'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const SIDEBAR_COLLAPSED_KEY = 'mf_admin_sidebar_collapsed'

type AdminWorkspaceContextValue = {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(null)

export function AdminWorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      setSidebarCollapsedState(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
    } catch {
      /* ignore */
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.setAttribute(
      'data-admin-sidebar',
      sidebarCollapsed ? 'collapsed' : 'expanded',
    )
  }, [sidebarCollapsed, hydrated])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed)
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((c) => {
      const next = !c
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ sidebarCollapsed, toggleSidebar, setSidebarCollapsed }),
    [sidebarCollapsed, toggleSidebar, setSidebarCollapsed],
  )

  return <AdminWorkspaceContext.Provider value={value}>{children}</AdminWorkspaceContext.Provider>
}

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext)
  if (!ctx) {
    throw new Error('useAdminWorkspace must be used within AdminWorkspaceProvider')
  }
  return ctx
}
