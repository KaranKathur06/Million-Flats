'use client'

import { useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'

export type FileMeta = {
  id?: string
  name: string
  size: number
  url?: string | null
}

type PdfDropzoneProps = {
  value?: FileMeta | null
  onUpload: (file: File) => Promise<void>
  onDelete: () => Promise<void>
  loading?: boolean
}

export default function PdfDropzone({ value, onUpload, onDelete, loading = false }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [retryFile, setRetryFile] = useState<File | null>(null)

  const sizeLabel = useMemo(() => {
    if (!value?.size) return ''
    const mb = (value.size / 1024 / 1024).toFixed(2)
    return `${mb} MB`
  }, [value?.size])

  const validatePdf = (file: File) => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF files are allowed'
    }
    return ''
  }

  const uploadValidated = async (file: File) => {
    const validationError = validatePdf(file)
    if (validationError) {
      setError(validationError)
      toast.error(validationError)
      return
    }
    setError('')
    setRetryFile(file)
    try {
      await onUpload(file)
      setRetryFile(null)
    } catch (e: any) {
      setError(e?.message || 'Upload failed. Try again.')
      toast.error(e?.message || 'Upload failed. Try again.')
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void uploadValidated(file)
          e.currentTarget.value = ''
        }}
      />

      {!value ? (
        <div
          className={`group relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 ${
            error
              ? 'border-red-500/40 bg-red-500/5 hover:border-red-500/60'
              : dragOver
                ? 'border-amber-400/60 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                : 'border-white/[0.15] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-amber-400/40 hover:bg-amber-400/5'
          } ${loading ? 'opacity-60 pointer-events-none' : ''}`}
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            if (!loading) setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            if (loading) return
            const file = e.dataTransfer.files?.[0]
            if (file) void uploadValidated(file)
          }}
        >
          <div className="flex flex-col items-center gap-3">
            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
              error
                ? 'bg-red-500/10 text-red-400'
                : dragOver
                  ? 'bg-amber-500/15 text-amber-300 scale-110'
                  : 'bg-white/[0.06] text-white/40 group-hover:bg-amber-400/10 group-hover:text-amber-300 group-hover:scale-105'
            }`}>
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z"/>
              </svg>
            </div>

            {/* Main Text */}
            <div>
              <p className={`font-semibold transition-colors ${error ? 'text-red-400' : dragOver ? 'text-amber-300' : 'text-white/80'}`}>
                {dragOver ? 'Drop PDF to upload' : 'Upload Brochure (PDF)'}
              </p>
              <p className="text-xs text-white/40 mt-1">PDF only</p>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
              className={`mt-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                error
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-amber-400/90 text-black hover:bg-amber-300 border border-amber-400/50'
              } disabled:opacity-50`}
              disabled={loading}
            >
              {loading ? 'Uploading…' : 'Select PDF'}
            </button>

            {/* Status Messages */}
            {loading && (
              <div className="flex items-center gap-2 mt-2">
                <svg className="w-4 h-4 animate-spin text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm text-amber-300 font-medium">Uploading PDF…</p>
              </div>
            )}
            
            {error && (
              <div className="flex items-start gap-2 mt-2 bg-red-500/10 p-3 rounded-lg w-full">
                <svg className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {retryFile && !loading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void uploadValidated(retryFile)
                }}
                className="text-xs text-amber-300 hover:text-amber-200 underline mt-1 font-medium"
              >
                ↻ Retry upload
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="group overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-r from-white/[0.04] to-white/[0.02] p-4 transition-all duration-300 hover:border-white/[0.12] hover:bg-gradient-to-r hover:from-white/[0.06] hover:to-white/[0.03]">
          <div className="flex items-center justify-between gap-4">
            {/* File Info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400/15 to-amber-500/5 border border-amber-400/20 flex items-center justify-center flex-shrink-0 transition-all group-hover:from-amber-400/20 group-hover:to-amber-500/10">
                <svg className="w-6 h-6 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z"/>
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white/90 truncate">{value.name}</p>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 flex-shrink-0 border border-emerald-400/30">
                    ✓ UPLOADED
                  </span>
                </div>
                <p className="text-xs text-white/50 mt-0.5">{sizeLabel || 'PDF file'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {value.url && (
                <a
                  href={value.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] bg-white/[0.05] px-3 py-2 text-xs font-medium text-white/70 transition-all hover:bg-white/[0.10] hover:border-white/[0.2]"
                  title="Open PDF in new window"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Preview
                </a>
              )}

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-300 transition-all hover:border-amber-400/50 hover:bg-amber-400/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Replace with new PDF"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Replace
              </button>

              <button
                type="button"
                onClick={() => void onDelete()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-all hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete PDF"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

