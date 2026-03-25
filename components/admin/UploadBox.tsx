'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface UploadBoxProps {
  label: string
  hint?: string
  currentUrl?: string
  onUploaded: (url: string) => void
  aspectRatio?: 'square' | 'banner' | 'video' // for future-proofing
  endpoint?: string // default override logic inside
  uploadData?: Record<string, string> // key-values appended to formData
}

export default function UploadBox({
  label,
  hint,
  currentUrl = '',
  onUploaded,
  aspectRatio = 'square',
  endpoint = '/api/admin/developers/upload',
  uploadData = {},
}: UploadBoxProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [previewUrl, setPreviewUrl] = useState(currentUrl)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // If external URL updates and we don't hold a local blob preview
    if (currentUrl && !previewUrl.startsWith('blob:')) {
      setPreviewUrl(currentUrl)
    }
  }, [currentUrl])

  useEffect(() => {
    // Prevent memory leaks for blob URLs
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return

      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowed.includes(file.type)) {
        setUploadError('Only PNG, JPG, WebP allowed')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Max file size is 5MB')
        return
      }

      setUploading(true)
      setUploadError('')

      // Optimistic preview using URL.createObjectURL (fastest)
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)

      try {
        const form = new FormData()
        form.append('file', file)
        Object.entries(uploadData).forEach(([k, v]) => {
          form.append(k, v)
        })

        const res = await fetch(endpoint, {
          method: 'POST',
          body: form,
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.message || 'Upload failed')

        // Let the form know about the new real URL
        onUploaded(json.url)
      } catch (err: any) {
        setUploadError(err.message || 'Upload failed')
        // Revert to old valid url (if preview was blob, it'll correctly flip back to currentUrl)
        setPreviewUrl(currentUrl)
      } finally {
        setUploading(false)
      }
    },
    [endpoint, uploadData, currentUrl, onUploaded]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleRemove = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl('')
    onUploaded('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const isSquare = aspectRatio === 'square'

  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
        {label}
      </label>

      {previewUrl ? (
        <div className="relative group">
          {isSquare ? (
            <div className="h-28 w-28 rounded-xl border border-white/[0.08] bg-white overflow-hidden p-1.5 flex-shrink-0">
              <img
                src={previewUrl}
                alt={label}
                className="h-full w-full object-contain"
                onError={() => setPreviewUrl('')}
              />
            </div>
          ) : (
            <div className="h-36 rounded-xl border border-white/[0.08] overflow-hidden">
              <img
                src={previewUrl}
                alt={label}
                className="h-full w-full object-cover"
                onError={() => setPreviewUrl('')}
              />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 rounded-xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400/20 border border-amber-400/30 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/30 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="inline-flex items-center gap-1 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Remove
            </button>
          </div>

          {uploading && (
            <div className="absolute inset-0 rounded-xl bg-black/70 flex items-center justify-center backdrop-blur-[2px]">
              <svg className="h-6 w-6 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
        </div>
      ) : (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            uploading
              ? 'border-amber-400/40 bg-amber-400/[0.04]'
              : 'border-white/[0.10] bg-white/[0.02] hover:border-amber-400/30 hover:bg-amber-400/[0.03]'
          } ${isSquare ? 'h-28 w-28' : 'h-36 w-full'}`}
        >
          {uploading ? (
            <svg className="h-6 w-6 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-2">
              <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:bg-amber-400/10 group-hover:border-amber-400/20 transition-all">
                <svg className="h-5 w-5 text-white/30 group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[11px] text-white/30 group-hover:text-white/50 text-center leading-tight transition-colors">
                {isSquare ? (
                  <>
                    <span className="block font-medium mb-0.5">Click or drag</span>
                    <span className="text-[10px]">to upload</span>
                  </>
                ) : (
                  'Click to upload or drag & drop'
                )}
              </p>
            </div>
          )}
        </label>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpg,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {hint && <p className="mt-2 text-[10px] text-white/25 leading-relaxed">{hint}</p>}
      {uploadError && <p className="mt-1.5 text-[10px] text-red-400">{uploadError}</p>}
    </div>
  )
}
