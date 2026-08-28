'use client'

import { useEffect, useCallback } from 'react'

/**
 * Warns users when they try to leave a page with unsaved changes.
 * Uses the browser's beforeunload event.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const handler = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    },
    [isDirty]
  )

  useEffect(() => {
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [handler])
}
