'use client'

import { useEffect, useId, type ReactNode } from 'react'

interface GlobalPermanentDeleteDialogProps {
  open: boolean
  title: string
  description: string
  details?: ReactNode
  confirmLabel?: string
  loadingLabel?: string
  error?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function GlobalPermanentDeleteDialog({
  open,
  title,
  description,
  details,
  confirmLabel = 'Permanently delete',
  loadingLabel = 'Deleting...',
  error,
  loading = false,
  onConfirm,
  onCancel,
}: GlobalPermanentDeleteDialogProps) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onCancel, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-red-500/30 bg-[#0b1220] p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/25 bg-red-400/10 text-red-300" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
            <path d="M12 8v4m0 4h.01M4.93 19h14.14c1.3 0 2.11-1.4 1.46-2.53L13.46 4.2a1.68 1.68 0 0 0-2.92 0L3.47 16.47A1.68 1.68 0 0 0 4.93 19Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 id={titleId} className="text-lg font-semibold text-white">{title}</h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-white/65">{description}</p>
        {details ? <div className="mt-4">{details}</div> : null}
        {error ? (
          <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg border border-red-400/35 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
