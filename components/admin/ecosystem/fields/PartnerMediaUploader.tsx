'use client'

import { useState, useRef, useCallback } from 'react'

type PartnerMediaUploaderProps = {
  partnerId?: string
  mediaType: 'LOGO' | 'COVER'
  currentUrl?: string | null
  label: string
  helpText?: string
  maxSizeMB?: number
  recommendedSize?: string
  onUploaded?: (url: string) => void
  onDeleted?: () => void
  disabled?: boolean
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export default function PartnerMediaUploader({
  partnerId,
  mediaType,
  currentUrl,
  label,
  helpText,
  maxSizeMB = 2,
  recommendedSize,
  onUploaded,
  onDeleted,
  disabled = false,
}: PartnerMediaUploaderProps) {
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const hasPreview = Boolean(preview)
  const isNew = !partnerId

  const handleFile = useCallback(
    async (file: File) => {
      setError('')

      // Client-side validation
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed (JPEG, PNG, WebP, SVG)')
        return
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File too large. Maximum ${maxSizeMB}MB allowed.`)
        return
      }

      // For new partners (no ID yet), show preview and store URL
      if (isNew) {
        const url = URL.createObjectURL(file)
        setPreview(url)
        onUploaded?.(url)
        return
      }

      // Upload to API
      setState('uploading')
      setProgress(10)

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', mediaType)

        setProgress(30)

        const res = await fetch(`/api/admin/ecosystem-partners/manage/${partnerId}/media`, {
          method: 'POST',
          body: formData,
        })

        setProgress(80)

        const json = await res.json()
        if (!json.success) {
          throw new Error(json.message || 'Upload failed')
        }

        setProgress(100)
        setState('success')
        setPreview(json.data.publicUrl)
        onUploaded?.(json.data.publicUrl)

        setTimeout(() => setState('idle'), 2000)
      } catch (err) {
        setState('error')
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    },
    [partnerId, mediaType, maxSizeMB, isNew, onUploaded]
  )

  const handleDelete = useCallback(async () => {
    if (isNew) {
      setPreview(null)
      onDeleted?.()
      return
    }

    try {
      const res = await fetch(
        `/api/admin/ecosystem-partners/manage/${partnerId}/media?type=${mediaType}`,
        { method: 'DELETE' }
      )
      const json = await res.json()
      if (!json.success) throw new Error(json.message)

      setPreview(null)
      onDeleted?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }, [partnerId, mediaType, isNew, onDeleted])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => setDragActive(false)

  const isExternalUrl = preview && !preview.startsWith('blob:') && !preview.includes('/api/')

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/60">{label}</span>
        {recommendedSize && (
          <span className="text-[10px] text-white/30">{recommendedSize}</span>
        )}
      </div>

      {/* Preview state */}
      {hasPreview ? (
        <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
          <div className={`flex items-center justify-center ${mediaType === 'LOGO' ? 'h-32 p-4' : 'h-48'}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview!}
              alt={`${label} preview`}
              className={`${mediaType === 'LOGO' ? 'max-h-24 object-contain' : 'h-full w-full object-cover'}`}
            />
          </div>
          <div className="flex items-center justify-between border-t border-white/10 bg-white/5 px-3 py-2">
            <span className="text-xs text-white/40 truncate max-w-[60%]">
              {isExternalUrl ? 'External URL' : 'Uploaded'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                className="text-xs text-accent-yellow/80 hover:text-accent-yellow transition-colors disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={disabled}
                className="text-xs text-red-400/80 hover:text-red-400 transition-colors disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
            dragActive
              ? 'border-accent-yellow/50 bg-accent-yellow/5'
              : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5'
          } ${mediaType === 'LOGO' ? 'h-32' : 'h-40'} ${disabled ? 'pointer-events-none opacity-40' : ''}`}
        >
          {state === 'uploading' ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent-yellow transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-white/40">Uploading...</span>
            </div>
          ) : (
            <>
              <svg className="mb-2 h-6 w-6 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-xs text-white/40">
                Drag & drop or <span className="text-accent-yellow/80">browse</span>
              </span>
              <span className="mt-0.5 text-[10px] text-white/25">
                JPEG, PNG, WebP{mediaType === 'LOGO' ? ', SVG' : ''} · Max {maxSizeMB}MB
              </span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />

      {helpText && !error && <p className="text-xs text-white/30">{helpText}</p>}
      {error && <p className="text-xs font-medium text-red-400">{error}</p>}
    </div>
  )
}
