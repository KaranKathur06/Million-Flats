'use client'

import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { useAdminAction } from '@/components/admin/AdminActionProvider'

export default function ActionMenu({
  user,
  onOpenRoleModal,
  onAction,
}: {
  user: any
  onOpenRoleModal: (u: any) => void
  onAction: (fn: () => Promise<void>) => Promise<void>
}) {
  const { runAction } = useAdminAction()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onDoc)
      document.addEventListener('keydown', onKey)
    }
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const doConfirm = async (title: string, message: string, fn: () => Promise<void>, variant: 'danger' | 'governance' = 'governance') => {
    setOpen(false)
    await runAction({
      title,
      description: message,
      confirmLabel: title.replace('?', ''),
      variant,
      loadingTitle: 'Updating User',
      successTitle: 'User Updated',
      errorMessage: 'Unable to complete this user action.',
      mutation: () => onAction(fn),
    })
  }

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button aria-haspopup="menu" aria-expanded={open} aria-label="Open actions" onClick={() => setOpen((v) => !v)} onKeyDown={(e) => { if (e.key === 'Enter') setOpen((v) => !v) }} className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">⋯</button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-xl border border-white/[0.06] bg-[#071123] p-2 shadow-lg z-50">
          <Link role="menuitem" href={`/admin/users/${encodeURIComponent(user.id)}`} className="block px-3 py-2 rounded hover:bg-white/5">View profile</Link>
          <Link role="menuitem" href={`/admin/users/${encodeURIComponent(user.id)}`} className="block px-3 py-2 rounded hover:bg-white/5">Edit user</Link>
          <button role="menuitem" onClick={() => { setOpen(false); onOpenRoleModal(user) }} className="w-full text-left px-3 py-2 rounded hover:bg-white/5">Manage role</button>
          <button role="menuitem" onClick={() => doConfirm('Suspend this user?', 'This will disable login for the user.', async () => { await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/ban`, { method: 'POST' }) })} className="w-full text-left px-3 py-2 rounded hover:bg-white/5">Suspend</button>
          <button role="menuitem" onClick={() => doConfirm('Reset this user password?', 'A password reset email will be sent to the user.', async () => { await fetch(`/api/auth/resend?email=${encodeURIComponent(user.email)}`, { method: 'POST' }).catch(() => null) })} className="w-full text-left px-3 py-2 rounded hover:bg-white/5">Reset password</button>
          <button role="menuitem" onClick={() => doConfirm('View CRM?', 'The CRM integration is not available yet.', async () => { throw new Error('CRM integration is not available yet.') })} className="w-full text-left px-3 py-2 rounded hover:bg-white/5">View CRM</button>
          <button role="menuitem" onClick={() => doConfirm('View activity?', 'The activity timeline is not available yet.', async () => { throw new Error('The activity timeline is not available yet.') })} className="w-full text-left px-3 py-2 rounded hover:bg-white/5">View activity</button>
          <button role="menuitem" onClick={() => doConfirm('Export user data?', 'A current export will be generated for this user.', async () => { window.location.href = `/api/admin/users/${encodeURIComponent(user.id)}/export` })} className="w-full text-left px-3 py-2 rounded hover:bg-white/5">Export user</button>
          <div className="border-t border-white/[0.04] my-2" />
          <button role="menuitem" onClick={() => doConfirm('Delete this user?', 'This action is permanent.', async () => { await fetch(`/api/admin/users/${encodeURIComponent(user.id)}/delete`, { method: 'POST' }) }, 'danger')} className="w-full text-left px-3 py-2 rounded text-red-300 hover:bg-red-600/10">Delete</button>
        </div>
      ) : null}
    </div>
  )
}
