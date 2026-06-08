'use client'

import { type ReactNode, useCallback, useState } from 'react'

type Props = {
  labelShow?: string
  labelHide?: string
  defaultOpen?: boolean
  children: ReactNode
}

export default function RevealContent({ labelShow = 'Show', labelHide = 'Hide', defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const toggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="mt-4 inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
      >
        {open ? labelHide : labelShow}
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  )
}
