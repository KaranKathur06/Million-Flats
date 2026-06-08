'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useBodyScrollLock } from '@/lib/responsive/useBodyScrollLock'

type MobileOffCanvasPanelProps = {
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  title?: React.ReactNode
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
  panelClassName?: string
  zIndex?: number
}

/**
 * Off-canvas drawer with independent scroll, dvh height, safe-area, and body scroll lock.
 */
export function MobileOffCanvasPanel({
  open,
  onClose,
  side = 'left',
  title,
  header,
  children,
  className,
  panelClassName,
  zIndex = 80,
}: MobileOffCanvasPanelProps) {
  useBodyScrollLock(open)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const slideFrom = side === 'left' ? '-translate-x-full' : 'translate-x-full'
  const slideOpen = 'translate-x-0'
  const anchor = side === 'left' ? 'left-0' : 'right-0'

  return (
    <div
      className={cn('fixed inset-0 md:hidden', open ? '' : 'pointer-events-none', className)}
      style={{ zIndex }}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className={cn(
          'absolute top-0 flex h-[100dvh] max-h-[100dvh] w-[min(100%,20rem)] max-w-[85%] flex-col border-white/[0.08] bg-[#0a1019] shadow-2xl shadow-black/50 transition-transform duration-300 ease-out',
          anchor,
          side === 'left' ? 'border-r' : 'border-l',
          open ? slideOpen : slideFrom,
          panelClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Navigation menu'}
      >
        {header ?? (
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.04] px-4 pt-[env(safe-area-inset-top)]">
            {title ? <span className="text-base font-semibold text-white/95">{title}</span> : <span />}
            <button
              type="button"
              onClick={onClose}
              className="mf-touch-target inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/50 hover:bg-white/[0.06] hover:text-white"
              aria-label="Close menu"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="mf-drawer-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin pb-[env(safe-area-inset-bottom)]">
          {children}
        </div>
      </div>
    </div>
  )
}
