'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type FileUploadBoxProps = {
  type: 'pdf'
  maxSizeMB: number
  file: File | null
  onFileChange: (file: File | null) => void
  disabled?: boolean
}

function isPdf(file: File) {
  return String(file.type || '').toLowerCase() === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export default function FileUploadBox({ type, maxSizeMB, file, onFileChange, disabled }: FileUploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')

  const previewUrl = useMemo(() => {
    if (!file) return ''
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function validate(nextFile: File) {
    if (type === 'pdf' && !isPdf(nextFile)) return 'Only PDF files are allowed.'
    if (nextFile.size > maxSizeMB * 1024 * 1024) return `File too large (max ${maxSizeMB}MB).`
    return ''
  }

  function setSelected(nextFile: File | null) {
    if (!nextFile) {
      setError('')
      onFileChange(null)
      return
    }
    const validationError = validate(nextFile)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    onFileChange(nextFile)
  }

  function openPicker() {
    if (disabled) return
    inputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] || null
          setSelected(nextFile)
          event.currentTarget.value = ''
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openPicker()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setDragActive(true)
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          setDragActive(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragActive(false)
          if (disabled) return
          const droppedFile = event.dataTransfer.files?.[0] || null
          setSelected(droppedFile)
        }}
        className={`rounded-2xl border-2 border-dashed bg-[#0c1422] px-6 py-8 text-center transition-all ${
          dragActive ? 'border-amber-400/80 bg-amber-500/10' : 'border-white/20 hover:border-amber-400/60'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-xl">
          📄
        </div>
        <p className="text-sm font-semibold text-white">Drag and drop your PDF here</p>
        <p className="mt-1 text-xs text-white/55">or</p>
        <button
          type="button"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation()
            openPicker()
          }}
          className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-amber-400 px-4 text-sm font-semibold text-[#111827] hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Select PDF File
        </button>
        <p className="mt-3 text-xs text-white/50">Max size: {maxSizeMB}MB • PDF only</p>
      </div>

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {file && previewUrl ? (
        <div className="rounded-2xl border border-white/10 bg-[#0a1019] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">PDF Preview</p>
          <div className="h-[420px] overflow-hidden rounded-xl border border-white/10 bg-white">
            <iframe src={previewUrl} title="PDF preview" className="h-full w-full" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={openPicker}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-white/20 px-3 text-xs font-semibold text-white/80 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Replace
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setSelected(null)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-red-400/40 px-3 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remove
            </button>
          </div>
          <p className="mt-2 truncate text-xs text-white/50">{file.name}</p>
        </div>
      ) : null}
    </div>
  )
}
