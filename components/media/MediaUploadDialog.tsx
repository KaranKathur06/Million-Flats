'use client'

import { useRef, useState } from 'react'
import { useMediaUpload, type UploadFile } from '@/hooks/useMediaUpload'
import type { GlobalDropdownOption } from '@/components/ui/GlobalDropdown'
import GlobalDropdown from '@/components/ui/GlobalDropdown'

export function MediaUploadDialog({ entityId, title, categories, initialCategory, appearance = 'dark', presignEndpoint, finalizeEndpoint, buildPresignBody, buildFinalizeBody, isOpen, onClose, onComplete }: {
  entityId: string
  title: string
  categories: GlobalDropdownOption[]
  presignEndpoint: string
  finalizeEndpoint: string
  buildPresignBody: (file: File, category: string) => Record<string, unknown>
  buildFinalizeBody: (file: File, category: string, s3Key: string) => Record<string, unknown>
  initialCategory?: string
  appearance?: 'dark' | 'light'
  isOpen: boolean
  onClose: () => void
  onComplete?: (media: any) => void
}) {
  const [category, setCategory] = useState(initialCategory || categories[0]?.value || '')
  const [dragging, setDragging] = useState(false)
  const light = appearance === 'light'
  const inputRef = useRef<HTMLInputElement>(null)
  const { files, addFiles, removeFile, retryFile } = useMediaUpload({
    projectId: entityId,
    category,
    presignEndpoint,
    finalizeEndpoint,
    buildPresignBody: (file) => buildPresignBody(file, category),
    buildFinalizeBody: (file, s3Key) => buildFinalizeBody(file, category, s3Key),
    onSuccess: (media) => onComplete?.(media),
  })
  if (!isOpen) return null
  const add = (items: File[]) => addFiles(items.filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf' || file.type === 'image/svg+xml'))
  const complete = files.length > 0 && files.every((file) => file.state === 'completed')
  return <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${light ? 'bg-dark-blue/20' : 'bg-black/50'}`}><div className={`relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl ${light ? 'border-gray-200 bg-white' : 'border-white/[0.08] bg-[#0b1420]'}`}><div className="mb-6 flex items-center justify-between"><div><h2 className={`text-xl font-semibold ${light ? 'text-dark-blue' : 'text-white'}`}>Upload {title} Media</h2><p className={`mt-1 text-xs ${light ? 'text-gray-500' : 'text-white/40'}`}>Upload files first, then manage categories in the library.</p></div><button type="button" onClick={onClose} aria-label="Close" className={light ? 'text-gray-400 hover:text-dark-blue' : 'text-white/50 hover:text-white'}>×</button></div><div className="mb-5"><label className={`mb-2 block text-xs font-semibold uppercase tracking-wider ${light ? 'text-gray-500' : 'text-white/40'}`}>Category for this batch</label><GlobalDropdown value={category} onChange={(value) => setCategory(String(value))} options={categories} appearance={light ? 'admin-light' : 'admin-dark'} showLabel={false} /></div>{files.length === 0 ? <div onDragEnter={(event) => { event.preventDefault(); setDragging(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); add(Array.from(event.dataTransfer.files)) }} className={`rounded-xl border-2 border-dashed p-10 text-center ${dragging ? (light ? 'border-dark-blue/40 bg-blue-50' : 'border-amber-400/60 bg-amber-400/10') : (light ? 'border-gray-300 bg-gray-50' : 'border-white/[0.12] bg-white/[0.02]')}`}><p className={`text-sm font-medium ${light ? 'text-dark-blue' : 'text-white/70'}`}>Drop media here</p><p className={`mt-1 text-xs ${light ? 'text-gray-500' : 'text-white/40'}`}>or choose multiple files</p><button type="button" onClick={() => inputRef.current?.click()} className="mt-4 rounded-lg bg-dark-blue px-4 py-2 text-sm font-medium text-white">Browse files</button><input ref={inputRef} type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={(event) => { add(Array.from(event.target.files || [])); event.currentTarget.value = '' }} /></div> : <div className="max-h-64 space-y-2 overflow-y-auto">{files.map((file) => <UploadRow key={file.id} file={file} onRemove={() => removeFile(file.id)} onRetry={() => retryFile(file.id)} />)}</div>}<div className="mt-6 flex justify-between"><button type="button" onClick={onClose} className={`rounded-lg border px-4 py-2 text-sm ${light ? 'border-gray-200 text-dark-blue' : 'border-white/[0.08] text-white/60'}`}>Close</button>{complete ? <button type="button" onClick={() => { onClose() }} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white">Done</button> : null}</div></div></div>
}

function UploadRow({ file, onRemove, onRetry }: { file: UploadFile; onRemove: () => void; onRetry: () => void }) {
  const failed = file.state === 'upload_failed' || file.state === 'finalization_failed'
  return <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3"><div className="flex items-center justify-between gap-3"><span className="truncate text-sm text-white/80">{file.file.name}</span><span className={`text-xs ${failed ? 'text-red-400' : file.state === 'completed' ? 'text-emerald-400' : 'text-amber-400'}`}>{failed ? 'Upload failed' : file.state === 'completed' ? 'Uploaded' : `${file.progress}%`}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-400 transition-all" style={{ width: `${file.progress}%` }} /></div>{failed ? <button type="button" onClick={onRetry} className="mt-2 text-xs text-amber-300">Retry</button> : null}{file.state !== 'completed' && !failed ? null : <button type="button" onClick={onRemove} className="ml-3 mt-2 text-xs text-white/50">Remove</button>}</div>
}
