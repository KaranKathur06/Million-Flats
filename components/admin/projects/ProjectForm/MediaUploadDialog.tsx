'use client'

import { useState, useRef, useCallback } from 'react'
import { useMediaUpload, type UploadFile } from '@/hooks/useMediaUpload'

interface MediaUploadDialogProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

const MEDIA_CATEGORIES = [
  { value: 'hero', label: 'Hero', icon: '👑' },
  { value: 'other', label: 'Other', icon: '🗂️' },
  { value: 'exterior', label: 'Exterior', icon: '🏘️' },
  { value: 'amenities', label: 'Amenities', icon: '✨' },
  { value: 'lifestyle', label: 'Lifestyle', icon: '🌟' },
]

export function MediaUploadDialog({ projectId, isOpen, onClose, onComplete }: MediaUploadDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState('hero')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { files, addFiles, removeFile, retryFile } = useMediaUpload({
    projectId,
    category: selectedCategory,
    onSuccess: () => {},
    onError: () => {},
  })

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

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/') || f.type === 'application/pdf'
    )
    addFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files))
    }
  }

  const allComplete = files.length > 0 && files.every((f) => f.state === 'completed')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 backdrop-blur">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Upload Project Media</h2>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/70 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Category Selector */}
        <div className="mb-6">
          <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-white/40">
            Category
          </label>
          <div className="grid grid-cols-5 gap-2">
            {MEDIA_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  selectedCategory === cat.value
                    ? 'bg-amber-400/20 border border-amber-400/50 text-amber-300'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]'
                }`}
              >
                <span className="text-lg">{cat.icon}</span>
                <div className="text-xs">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Upload Area */}
        {files.length === 0 && (
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mb-6 rounded-xl border-2 border-dashed p-8 transition ${
              isDragging
                ? 'border-amber-400/50 bg-amber-400/5'
                : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2]'
            }`}
          >
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 mb-3 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm font-medium text-white/60 mb-2">
                Drag and drop images here
              </p>
              <p className="text-xs text-white/40 mb-4">
                or
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg bg-amber-400/20 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-400/30 transition"
              >
                Browse Files
              </button>
              <p className="mt-3 text-xs text-white/40">
                Supported: JPG, PNG, WebP, AVIF
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="mb-6 space-y-2 max-h-60 overflow-y-auto">
            {files.map((uploadFile) => (
              <FileUploadItem
                key={uploadFile.id}
                file={uploadFile}
                onRemove={() => removeFile(uploadFile.id)}
                onRetry={() => retryFile(uploadFile.id)}
              />
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.04]"
          >
            Close
          </button>
          {allComplete && (
            <button
              onClick={() => {
                onComplete?.()
                onClose()
              }}
              className="rounded-lg bg-emerald-400/20 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-400/30"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface FileUploadItemProps {
  file: UploadFile
  onRemove: () => void
  onRetry: () => void
}

function FileUploadItem({ file, onRemove, onRetry }: FileUploadItemProps) {
  const getStatusIcon = () => {
    switch (file.state) {
      case 'completed':
        return '✓'
      case 'upload_failed':
      case 'finalization_failed':
        return '✕'
      case 'uploading':
      case 'finalizing':
        return '⟳'
      default:
        return '○'
    }
  }

  const getStatusColor = () => {
    switch (file.state) {
      case 'completed':
        return 'text-emerald-400'
      case 'upload_failed':
      case 'finalization_failed':
        return 'text-red-400'
      case 'uploading':
      case 'finalizing':
        return 'text-amber-400'
      default:
        return 'text-white/40'
    }
  }

  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.08] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-lg ${getStatusColor()}`}>{getStatusIcon()}</span>
            <p className="text-sm font-medium text-white/80 truncate">{file.file.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/[0.1] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${file.progress}%` }}
              />
            </div>
            <span className="text-xs text-white/40 w-8 text-right">{file.progress}%</span>
          </div>
          {file.error && <p className="mt-1 text-xs text-red-400">{file.error}</p>}
        </div>

        <div className="flex items-center gap-2">
          {(file.state === 'upload_failed' || file.state === 'finalization_failed') && (
            <button
              onClick={onRetry}
              className="text-xs px-2 py-1 rounded bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
            >
              Retry
            </button>
          )}
          {file.state !== 'completed' && file.state !== 'uploading' && file.state !== 'finalizing' && (
            <button
              onClick={onRemove}
              className="text-xs px-2 py-1 rounded bg-red-400/20 text-red-300 hover:bg-red-400/30"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
