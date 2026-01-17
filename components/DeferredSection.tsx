'use client'

import { type ReactNode, useCallback, useMemo, useState } from 'react'

type Props = {
  title: string
  count?: number
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

export default function DeferredSection({ title, count, defaultOpen = false, className, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  const countLabel = useMemo(() => {
    if (typeof count !== 'number' || !Number.isFinite(count) || count <= 0) return ''
    return `${count}`
  }, [count])

  const toggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <section className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-serif font-bold text-dark-blue">{title}</h2>
          {!open && countLabel ? <p className="mt-2 text-sm text-gray-600">{countLabel} items</p> : null}
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          className="shrink-0 h-10 px-4 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
        >
          {open ? 'Hide' : 'Show'}
        </button>
      </div>

      {open ? children : null}
    </section>
  )
}
