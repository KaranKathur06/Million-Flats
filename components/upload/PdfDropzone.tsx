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

const MAX_PDF_SIZE = 20 * 1024 * 1024

export default function PdfDropzone({ value, onUpload, onDelete, loading = false }: PdfDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState('')
  const [retryFile, setRetryFile] = useState<File | null>(null)

  const sizeLabel = useMemo(() => {
    if (!value?.size) return ''
    return `${(value.size / 1024 / 1024).toFixed(2)} MB`
  }, [value?.size])

  const validatePdf = (file: File) => {
    if (file.type !== 'application/pdf') {
      return 'Only PDF allowed'
    }
    if (file.size > MAX_PDF_SIZE) {
      return 'Max file size is 20MB'
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
          className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition ${
            error
              ? 'border-red-500'
              : dragOver
                ? 'border-green-400 bg-green-900/10'
                : 'border-yellow-500 hover:bg-[#0f172a]'
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
            <div className="w-12 h-12 bg-[#1e293b] rounded-lg flex items-center justify-center text-xl">📄</div>
            <p className="text-white font-medium">Drag and drop your PDF here</p>
            <p className="text-sm text-gray-400">or</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                inputRef.current?.click()
              }}
              className="bg-yellow-500 text-black px-5 py-2 rounded-lg font-medium"
              disabled={loading}
            >
              Select PDF File
            </button>
            <p className="text-xs text-gray-500">Max size: 20MB • PDF only</p>
            {loading && <p className="text-xs text-yellow-300">Uploading...</p>}
            {error && <p className="text-xs text-red-400">{error}</p>}
            {retryFile && !loading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  void uploadValidated(retryFile)
                }}
                className="text-xs text-yellow-300 underline"
              >
                Retry upload
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-[#0f172a] border border-white/[0.08] rounded-xl p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-red-500/10 text-red-400 rounded-lg flex items-center justify-center text-lg">📄</div>
            <div className="min-w-0">
              <p className="text-white font-medium truncate">{value.name}</p>
              <p className="text-xs text-gray-400">{sizeLabel || 'PDF'}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {value.url ? (
              <a
                href={value.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/[0.08]"
              >
                Preview
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={loading}
              className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-300 hover:bg-yellow-500/20 disabled:opacity-50"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={loading}
              className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

