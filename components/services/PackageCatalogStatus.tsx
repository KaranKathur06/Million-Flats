'use client'

import { RotateCw } from 'lucide-react'
import type { PackageCatalogState } from '@/hooks/usePackageCatalog'

export function PackageCatalogStatus({ state, onRetry }: {
  state: PackageCatalogState
  onRetry: () => void
}) {
  if (state.status === 'ready') return null

  if (state.status === 'loading') {
    return <p className="text-sm text-gray-600" role="status">Loading tax-inclusive prices…</p>
  }

  if (state.status === 'unconfigured') {
    return <p className="text-sm text-amber-800" role="status">Checkout is unavailable because GST has not been configured.</p>
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm text-amber-800" role="alert">
      <span>Package prices could not be verified.</span>
      <button type="button" onClick={onRetry} className="inline-flex min-h-9 items-center gap-2 border border-amber-700 px-3 font-semibold hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700">
        <RotateCw size={15} aria-hidden="true" />
        Retry prices
      </button>
    </div>
  )
}