'use client'

import { useCallback, useRef, useState } from 'react'

export type UploadFileState = 'selected' | 'requesting' | 'authorized' | 'uploading' | 'uploaded' | 'finalizing' | 'completed' | 'validation_failed' | 'upload_failed' | 'finalization_failed'

export interface UploadFile {
  id: string
  uploadId: string
  category: string
  unitTypeId?: string
  file: File
  state: UploadFileState
  progress: number
  error?: string
  s3Key?: string
}

export interface UseMediaUploadOptions {
  projectId: string
  category: string
  unitTypeId?: string
  presignEndpoint?: string
  finalizeEndpoint?: string
  buildPresignBody?: (file: File, category: string, unitTypeId?: string) => Record<string, unknown>
  buildFinalizeBody?: (file: File, s3Key: string, category: string, unitTypeId?: string) => Record<string, unknown>
  onSuccess?: (media: any, s3Key: string) => void
  onError?: (fileId: string, error: string) => void
}

const MAX_CONCURRENT_UPLOADS = 3

async function getErrorMessage(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  return typeof body?.message === 'string' ? body.message : fallback
}

export function useMediaUpload({ projectId, category, unitTypeId, presignEndpoint, finalizeEndpoint, buildPresignBody, buildFinalizeBody, onSuccess, onError }: UseMediaUploadOptions) {
  const [files, setFiles] = useState<Map<string, UploadFile>>(new Map())
  const filesRef = useRef(files)
  const queueRef = useRef<string[]>([])
  const activeUploadsRef = useRef(0)
  const requestsRef = useRef<Map<string, XMLHttpRequest>>(new Map())
  const pumpQueueRef = useRef<() => void>(() => undefined)

  const setFilesAndRef = useCallback((next: Map<string, UploadFile>) => {
    filesRef.current = next
    setFiles(next)
  }, [])

  const updateFile = useCallback((fileId: string, update: Partial<UploadFile>) => {
    const current = filesRef.current.get(fileId)
    if (!current) return
    const next = new Map(filesRef.current)
    next.set(fileId, { ...current, ...update })
    setFilesAndRef(next)
  }, [setFilesAndRef])

  const doFinalize = useCallback(async (fileId: string, file: File, uploadId: string, s3Key: string, fileCategory: string, fileUnitTypeId?: string) => {
    updateFile(fileId, { state: 'finalizing', progress: 100, error: undefined, s3Key })
    let retryStorage = false
    try {
      const body = buildFinalizeBody ? buildFinalizeBody(file, s3Key, fileCategory, fileUnitTypeId) : {
        s3Key,
        fileName: file.name,
        fileSizeBytes: file.size,
        contentType: file.type,
        category: fileCategory,
        unitTypeId: fileUnitTypeId,
      }
      const response = await fetch(finalizeEndpoint || `/api/admin/projects/${projectId}/media/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, uploadId }),
      })

      if (!response.ok) {
        const message = await getErrorMessage(response, 'Media registration failed.')
        retryStorage = response.status < 500
        throw new Error(retryStorage ? `${message} Please retry the file upload.` : `${message} The file is uploaded; retry to finish registration.`)
      }

      const result = await response.json()
      updateFile(fileId, { state: 'completed', progress: 100, error: undefined })
      onSuccess?.(result.media, s3Key)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Media registration failed.'
      updateFile(fileId, { state: retryStorage ? 'upload_failed' : 'finalization_failed', progress: retryStorage ? 0 : 100, error: message })
      onError?.(fileId, message)
    }
  }, [buildFinalizeBody, finalizeEndpoint, projectId, updateFile, onSuccess, onError])

  const doUpload = useCallback(async (fileId: string, file: File, uploadId: string, fileCategory: string, fileUnitTypeId?: string) => {
    let stage: 'authorization' | 'storage' = 'authorization'
    try {
      updateFile(fileId, { state: 'requesting', progress: 0, error: undefined })
      const body = buildPresignBody ? buildPresignBody(file, fileCategory) : {
        fileName: file.name,
        fileSizeBytes: file.size,
        contentType: file.type,
        category: fileCategory,
        unitTypeId: fileUnitTypeId,
      }
      const response = await fetch(presignEndpoint || `/api/admin/projects/${projectId}/media/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, uploadId }),
      })

      if (!response.ok) {
        throw new Error(await getErrorMessage(response, 'Could not authorize this upload.'))
      }

      const authorization = await response.json()
      if (typeof authorization.uploadUrl !== 'string' || typeof authorization.s3Key !== 'string') {
        throw new Error('Upload authorization returned an invalid response.')
      }
      updateFile(fileId, { state: 'authorized', progress: 0, s3Key: authorization.s3Key })

      stage = 'storage'
      updateFile(fileId, { state: 'uploading', progress: 0 })
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest()
        requestsRef.current.set(fileId, request)
        request.open('PUT', authorization.uploadUrl)
        request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        request.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            updateFile(fileId, { progress: Math.min(100, Math.round((event.loaded / event.total) * 100)) })
          }
        }
        request.onload = () => request.status >= 200 && request.status < 300
          ? resolve()
          : reject(new Error('Storage upload failed. Please retry.'))
        request.onerror = () => reject(new Error('Storage upload failed. Check your connection and retry.'))
        request.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
        request.send(file)
      })
      requestsRef.current.delete(fileId)
      updateFile(fileId, { state: 'uploaded', progress: 100, s3Key: authorization.s3Key })
      await doFinalize(fileId, file, uploadId, authorization.s3Key, fileCategory, fileUnitTypeId)
    } catch (error) {
      requestsRef.current.delete(fileId)
      if (error instanceof DOMException && error.name === 'AbortError') return
      const message = error instanceof Error ? error.message : 'Upload failed. Please retry.'
      updateFile(fileId, {
        state: stage === 'authorization' ? 'validation_failed' : 'upload_failed',
        progress: 0,
        error: message,
      })
      onError?.(fileId, message)
    }
  }, [buildPresignBody, presignEndpoint, projectId, updateFile, doFinalize, onError])

  const pumpQueue = useCallback(() => {
    while (activeUploadsRef.current < MAX_CONCURRENT_UPLOADS && queueRef.current.length > 0) {
      const fileId = queueRef.current.shift()!
      const entry = filesRef.current.get(fileId)
      if (!entry || entry.state !== 'selected') continue
      activeUploadsRef.current += 1
      void doUpload(fileId, entry.file, entry.uploadId, entry.category, entry.unitTypeId).finally(() => {
        activeUploadsRef.current -= 1
        pumpQueueRef.current()
      })
    }
  }, [doUpload])
  pumpQueueRef.current = pumpQueue

  const addFiles = useCallback((filesToAdd: File[], options?: { category?: string; unitTypeId?: string }) => {
    const next = new Map(filesRef.current)
    for (const file of filesToAdd) {
      const id = crypto.randomUUID()
      next.set(id, {
        id,
        uploadId: id,
        category: options?.category || category,
        unitTypeId: options?.unitTypeId || unitTypeId,
        file,
        state: 'selected',
        progress: 0,
      })
      queueRef.current.push(id)
    }
    setFilesAndRef(next)
    pumpQueue()
  }, [category, unitTypeId, setFilesAndRef, pumpQueue])

  const removeFile = useCallback((fileId: string) => {
    requestsRef.current.get(fileId)?.abort()
    requestsRef.current.delete(fileId)
    queueRef.current = queueRef.current.filter((queuedId) => queuedId !== fileId)
    const next = new Map(filesRef.current)
    next.delete(fileId)
    setFilesAndRef(next)
  }, [setFilesAndRef])

  const retryFile = useCallback((fileId: string) => {
    const entry = filesRef.current.get(fileId)
    if (!entry || !['validation_failed', 'upload_failed', 'finalization_failed'].includes(entry.state)) return
    if (entry.state === 'finalization_failed' && entry.s3Key) {
      void doFinalize(fileId, entry.file, entry.uploadId, entry.s3Key, entry.category, entry.unitTypeId)
      return
    }
    updateFile(fileId, { state: 'selected', progress: 0, error: undefined })
    queueRef.current.push(fileId)
    pumpQueue()
  }, [doFinalize, updateFile, pumpQueue])

  return { files: Array.from(files.values()), addFiles, removeFile, retryFile }
}

export interface UseBrochureUploadOptions {
  projectId: string
  onSuccess?: (brochure: { id: string; fileUrl: string; fileName: string; fileSize: number }, s3Key: string) => void
  onError?: (error: string) => void
}

export function useBrochureUpload({ projectId, onSuccess, onError }: UseBrochureUploadOptions) {
  const [state, setState] = useState<UploadFileState>('selected')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>()
  const [s3Key, setS3Key] = useState<string>()
  const fileRef = useRef<File | null>(null)

  const finalizeBrochure = useCallback(async (file: File, key: string) => {
    setState('finalizing')
    setError(undefined)
    try {
      const finalizeRes = await fetch(`/api/admin/projects/${projectId}/brochure/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: key, fileName: file.name, fileSizeBytes: file.size }),
      })
      if (!finalizeRes.ok) throw new Error(await getErrorMessage(finalizeRes, 'Brochure registration failed.'))
      const result = await finalizeRes.json()
      if (!result?.brochure) throw new Error('Brochure registration returned an invalid response.')
      setState('completed')
      setProgress(100)
      onSuccess?.(result.brochure, key)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Brochure registration failed.'
      setState('finalization_failed')
      setError(`${message} The PDF is uploaded; retry to finish registration.`)
      onError?.(message)
    }
  }, [projectId, onSuccess, onError])

  const uploadBrochure = useCallback(async (file: File) => {
    fileRef.current = file
    try {
      if (file.type !== 'application/pdf') throw new Error('Only PDF files are allowed.')
      setState('requesting')
      setProgress(0)
      setError(undefined)
      const presignRes = await fetch(`/api/admin/projects/${projectId}/brochure/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileSizeBytes: file.size, contentType: file.type }),
      })
      if (!presignRes.ok) throw new Error(await getErrorMessage(presignRes, 'Could not authorize brochure upload.'))
      const presignData = await presignRes.json()
      setS3Key(presignData.s3Key)
      setState('uploading')
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open('PUT', presignData.uploadUrl)
        request.setRequestHeader('Content-Type', file.type)
        request.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) setProgress(Math.round((event.loaded / event.total) * 100))
        }
        request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error('Storage upload failed. Please retry.'))
        request.onerror = () => reject(new Error('Storage upload failed. Check your connection and retry.'))
        request.send(file)
      })
      await finalizeBrochure(file, presignData.s3Key)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Brochure upload failed.'
      setState('upload_failed')
      setError(message)
      onError?.(message)
    }
  }, [projectId, finalizeBrochure, onError])

  const retry = useCallback(() => {
    if (!fileRef.current) return
    if (state === 'finalization_failed' && s3Key) {
      void finalizeBrochure(fileRef.current, s3Key)
      return
    }
    void uploadBrochure(fileRef.current)
  }, [state, s3Key, finalizeBrochure, uploadBrochure])

  const reset = useCallback(() => {
    setState('selected')
    setProgress(0)
    setError(undefined)
    setS3Key(undefined)
    fileRef.current = null
  }, [])

  return { state, progress, error, s3Key, uploadBrochure, retry, reset }
}