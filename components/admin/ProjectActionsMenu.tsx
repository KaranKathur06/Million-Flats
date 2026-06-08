'use client'

import { useState } from 'react'
import ProjectActionsDrawer from '@/components/admin/ProjectActionsDrawer'

type Props = {
  projectId: string
  slug: string
  projectName: string
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

export default function ProjectActionsMenu({
  projectId,
  slug,
  projectName,
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
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mf-admin-row-action inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/60 transition-all duration-200 hover:border-amber-400/20 hover:bg-amber-400/[0.1] hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35"
        aria-label={`Actions for ${projectName}`}
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 4a2 2 0 110-4 2 2 0 010 4zm0 4a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      <ProjectActionsDrawer
        open={open}
        onClose={() => setOpen(false)}
        projectName={projectName}
        projectId={projectId}
        slug={slug}
        status={status}
        isDeleted={isDeleted}
        canPublishToggle={canPublishToggle}
        publishing={publishing}
        deleting={deleting}
        restoring={restoring}
        archiving={archiving}
        onPublishToggle={onPublishToggle}
        onArchive={onArchive}
        onDelete={onDelete}
        onRestore={onRestore}
      />
    </>
  )
}
