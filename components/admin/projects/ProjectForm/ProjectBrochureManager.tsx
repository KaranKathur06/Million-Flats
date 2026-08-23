'use client'

import { useEffect, useState, useRef } from 'react'
import { useBrochureUpload } from '@/hooks/useMediaUpload'
import { useAdminAction } from '@/components/admin/AdminActionProvider'

interface Brochure {
  id: string
  fileUrl: string
  fileName: string
  fileSize?: number | null
  uploadedAt?: string
}

interface ProjectBrochureManagerProps {
  projectId: string
  initialBrochure?: Brochure | null
}

export function ProjectBrochureManager({ projectId, initialBrochure }: ProjectBrochureManagerProps) {
  const { runAction } = useAdminAction()
  const [brochure, setBrochure] = useState<Brochure | null>(initialBrochure || null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { state, progress, error, uploadBrochure, reset } = useBrochureUpload({
    projectId,
    onSuccess: async (s3Key, fileName, fileSize) => {
      // Reload brochure data
      await loadBrochure()
      reset()
    },
    onError: () => {},
  })

  const loadBrochure = async () => {
    try {
      setIsLoading(true)
      // Brochure is loaded as part of project, we just display it
      // In real app, might fetch separately if needed
    } catch (err) {
      console.error('Failed to load brochure:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    if (droppedFiles[0]?.type === 'application/pdf') {
      uploadBrochure(droppedFiles[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      uploadBrochure(e.target.files[0])
    }
  }

  const handleDelete = async () => {
    await runAction({
      title: 'Delete this brochure?',
      description: 'The brochure will be permanently removed from this project.',
      confirmLabel: 'Delete Brochure',
      variant: 'danger',
      loadingTitle: 'Deleting Brochure',
      successTitle: 'Brochure Deleted',
      errorMessage: 'Unable to delete this brochure.',
      mutation: async () => {
        const res = await fetch(`/api/admin/projects/${projectId}/brochure`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Unable to delete this brochure.')
      },
      onSuccess: () => {
        setBrochure(null)
        reset()
      },
    })
  }

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Show upload state if uploading
  if (state !== 'selected') {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-amber-500/5 to-transparent p-6">
        <div className="mb-4 flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
          </svg>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Brochure (PDF)</h3>
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm text-white/70">Uploading...</p>
              <span className="text-xs text-white/40">{progress}%</span>
            </div>
            <div className="h-2 bg-white/[0.1] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </div>

          {(state === 'upload_failed' || state === 'finalization_failed') && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  reset()
                  if (fileInputRef.current) fileInputRef.current.click()
                }}
                className="flex-1 rounded-lg bg-amber-400/20 px-4 py-2 text-xs font-medium text-amber-300 hover:bg-amber-400/30"
              >
                Retry
              </button>
              <button
                onClick={reset}
                className="flex-1 rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-medium text-white/60 hover:bg-white/[0.04]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Show brochure info if uploaded
  if (brochure) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/5 to-transparent p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
            </svg>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Brochure</h3>
          </div>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            ✓ UPLOADED
          </span>
        </div>

        <div className="rounded-lg bg-white/[0.02] border border-white/[0.08] p-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{brochure.fileName}</p>
              <p className="text-xs text-white/40 mt-1">
                {formatFileSize(brochure.fileSize)}
              </p>
              {brochure.uploadedAt && (
                <p className="text-xs text-white/40 mt-1">
                  Uploaded {new Date(brochure.uploadedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <a
                href={brochure.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-blue-400/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-400/30 transition"
              >
                Preview
              </a>
              <button
                onClick={() => {
                  reset()
                  if (fileInputRef.current) fileInputRef.current.click()
                }}
                className="rounded-lg bg-amber-400/20 px-3 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-400/30 transition"
              >
                Replace
              </button>
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-400/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-400/30 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    )
  }

  // Show upload area if no brochure
  return (
    <div className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-amber-500/5 to-transparent p-6">
      <div className="mb-4 flex items-center gap-2">
        <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
        </svg>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">Brochure (PDF)</h3>
      </div>

      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? 'border-amber-400/50 bg-amber-400/5'
            : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2]'
        }`}
      >
        <svg className="mx-auto h-12 w-12 mb-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
        </svg>
        <p className="text-sm font-medium text-white/60 mb-2">
          Drag PDF here or
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/30 transition"
        >
          Browse Files
        </button>
        <p className="mt-3 text-xs text-white/40">
          PDF • Large files supported (up to 300 MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
