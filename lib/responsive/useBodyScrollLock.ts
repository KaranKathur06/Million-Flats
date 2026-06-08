'use client'

import { useEffect } from 'react'

/** Locks document body scroll while `locked` is true (mobile drawers, modals). */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    const prevOverflow = document.body.style.overflow
    const prevPaddingRight = document.body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPaddingRight
    }
  }, [locked])
}
