'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  onClose: () => void
  projectName: string
  projectId: string
  slug: string
  status: string
  isDeleted: boolean
  canPublishToggle: boolean
  publishing: boolean
  deleting: boolean
  restoring: boolean
  archiving: boolean
  onPublishToggle: () => void
  onArchive: () => void
  onDelete: () => void
  onRestore: () => void
}

function ActionRow({
  icon,
  label,
  description,
  onClick,
  href,
  external,
  disabled,
  tone = 'default',
}: {
  icon: React.ReactNode
  label: string
  description?: string
  onClick?: () => void
  href?: string
  external?: boolean
  disabled?: boolean
  tone?: 'default' | 'amber' | 'emerald' | 'danger'
}) {
  const toneClass = {
    default: 'text-white/85 hover:border-l-amber-400 hover:bg-amber-400/[0.08]',
    amber: 'text-amber-200 hover:border-l-amber-400 hover:bg-amber-400/[0.08]',
    emerald: 'text-emerald-300 hover:border-l-emerald-400 hover:bg-emerald-500/[0.08]',
    danger: 'text-red-300 hover:border-l-red-400 hover:bg-red-500/[0.08]',
  }[tone]

  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold leading-tight">{label}</span>
        {description ? <span className="mt-0.5 block text-[11px] text-white/40">{description}</span> : null}
      </span>
    </>
  )

  const className = `mf-admin-action-row group flex w-full items-center gap-3 rounded-xl border border-transparent border-l-[3px] border-l-transparent px-3 py-2.5 text-left transition-all duration-200 disabled:opacity-50 ${toneClass}`

  if (href) {
    return (
      <Link
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        onClick={onClick}
        className={className}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" disabled={disabled} onClick={onClick} className={className}>
      {inner}
    </button>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35 first:pt-0">
      {children}
    </p>
  )
}

function Divider() {
  return <div className="my-2 mx-3 h-px bg-white/[0.06]" role="separator" />
}

const icons = {
  edit: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  preview: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  publish: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  ),
  archive: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  delete: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  restore: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
}

export default function ProjectActionsDrawer({
  open,
  onClose,
  projectName,
  projectId,
  slug,
  status,
  isDeleted,
  canPublishToggle,
  publishing,
  deleting,
  restoring,
  archiving,
  onPublishToggle,
  onArchive,
  onDelete,
  onRestore,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open || typeof document === 'undefined') return null

  const publishLabel =
    publishing ? 'Updating…' : status === 'PUBLISHED' ? 'Unpublish' : 'Publish'

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity"
        aria-label="Close project actions"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-actions-title"
        className="mf-admin-drawer-panel relative flex h-full w-full max-w-[360px] flex-col border-l border-white/[0.08] bg-[rgba(7,18,34,0.95)] shadow-2xl shadow-black/40 backdrop-blur-[20px]"
      >
        <div className="shrink-0 border-b border-white/[0.06] px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400/80">Project actions</p>
              <h2 id="project-actions-title" className="mt-1 truncate text-lg font-bold text-white">
                {projectName}
              </h2>
              <p className="mt-1 text-xs text-white/40 capitalize">{status.replace(/_/g, ' ').toLowerCase()}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white"
              aria-label="Close"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto mf-admin-scroll px-2 py-3">
          {!isDeleted ? (
            <>
              <GroupLabel>Workspace</GroupLabel>
              <ActionRow
                icon={icons.edit}
                label="Edit project"
                description="Open full project editor"
                href={`/admin/projects/${projectId}`}
                onClick={onClose}
              />
              <ActionRow
                icon={icons.preview}
                label="Preview listing"
                description="View public project page"
                href={`/projects/${slug}`}
                external
                onClick={onClose}
              />

              {canPublishToggle ? (
                <>
                  <Divider />
                  <GroupLabel>Publishing</GroupLabel>
                  <ActionRow
                    icon={icons.publish}
                    label={publishLabel}
                    description={status === 'PUBLISHED' ? 'Move to draft on site' : 'Make visible on site'}
                    disabled={publishing}
                    tone="amber"
                    onClick={() => {
                      onPublishToggle()
                      onClose()
                    }}
                  />
                  {status !== 'ARCHIVED' ? (
                    <ActionRow
                      icon={icons.archive}
                      label={archiving ? 'Archiving…' : 'Archive project'}
                      description="Hide from listings, keep data"
                      disabled={archiving}
                      onClick={() => {
                        onArchive()
                        onClose()
                      }}
                    />
                  ) : null}
                </>
              ) : null}

              <Divider />
              <GroupLabel>Danger zone</GroupLabel>
              <ActionRow
                icon={icons.delete}
                label={deleting ? 'Deleting…' : 'Delete project'}
                description="Soft delete — can be restored"
                disabled={deleting}
                tone="danger"
                onClick={() => {
                  onDelete()
                  onClose()
                }}
              />
            </>
          ) : (
            <>
              <GroupLabel>Recovery</GroupLabel>
              <ActionRow
                icon={icons.edit}
                label="Edit project"
                href={`/admin/projects/${projectId}`}
                onClick={onClose}
              />
              <ActionRow
                icon={icons.restore}
                label={restoring ? 'Restoring…' : 'Restore project'}
                description="Return to active projects"
                disabled={restoring}
                tone="emerald"
                onClick={() => {
                  onRestore()
                  onClose()
                }}
              />
            </>
          )}
        </div>
      </aside>
    </div>,
    document.body,
  )
}
