'use client'

import { useCallback, useState, useRef } from 'react'

// Upload state types
export type UploadFileState = 'selected' | 'requesting' | 'authorized' | 'uploading' | 'uploaded' | 'finalizing' | 'completed' | 'validation_failed' | 'upload_failed' | 'finalization_failed'

export interface UploadFile {
  id: string
  file: File
  state: UploadFileState
  progress: number // 0-100
  error?: string
  presignedUrl?: string
  s3Key?: string
}

export interface UseMediaUploadOptions {
  projectId: string
  category: string
  unitTypeId?: string
  onSuccess?: (mediaId: string, s3Key: string) => void
  onError?: (fileId: string, error: string) => void
}

/**
 * Hook for managing media file uploads with presigned URLs.
 * Handles the complete state machine for each file.
 *
 * Uses a ref to track the files map so that async upload callbacks
 * always read the latest state (avoids stale-closure bug).
 */
export function useMediaUpload({ projectId, category, unitTypeId, onSuccess, onError }: UseMediaUploadOptions) {
  const [files, setFiles] = useState<Map<string, UploadFile>>(new Map())
  // Keep a ref in sync so async callbacks always see latest files
  const filesRef = useRef<Map<string, UploadFile>>(files)

  const setFilesAndRef = useCallback((updater: Map<string, UploadFile> | ((prev: Map<string, UploadFile>) => Map<string, UploadFile>)) => {
    if (typeof updater === 'function') {
      setFiles((prev) => {
        const next = updater(prev)
        filesRef.current = next
        return next
      })
    } else {
      filesRef.current = updater
      setFiles(updater)
    }
  }, [])

  const updateFileState = useCallback((fileId: string, state: UploadFileState, progress = 0, error?: string) => {
    setFilesAndRef((prev) => {
      const next = new Map(prev)
      const f = next.get(fileId)
      if (f) {
        next.set(fileId, { ...f, state, progress, error })
      }
      return next
    })
  }, [setFilesAndRef])

  // Core upload function — accepts File object directly to avoid stale reads
  const doUpload = useCallback(
    async (fileId: string, fileObj: File) => {
      try {
        // Step 1: Request presigned URL
        updateFileState(fileId, 'requesting', 10)

        const presignRes = await fetch(
          `/api/admin/projects/${projectId}/media/presign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: fileObj.name,
              fileSizeBytes: fileObj.size,
              contentType: fileObj.type,
              category,
              unitTypeId,
            }),
          }
        )

        if (!presignRes.ok) {
          const errorData = await presignRes.json().catch(() => ({ message: 'Failed to get upload URL' }))
          throw new Error(errorData.message || 'Failed to get upload URL')
        }

        const { uploadUrl, s3Key } = await presignRes.json()
        updateFileState(fileId, 'authorized', 20)

        // Step 2: Upload to S3
        updateFileState(fileId, 'uploading', 30)

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileObj.type || 'application/octet-stream',
          },
          body: fileObj,
        })

        if (!uploadRes.ok) {
          throw new Error(`Upload failed with status ${uploadRes.status}`)
        }

        updateFileState(fileId, 'uploaded', 80)

        // Step 3: Finalize in database
        updateFileState(fileId, 'finalizing', 90)
        const finalizeRes = await fetch(
          `/api/admin/projects/${projectId}/media/finalize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              s3Key,
              fileName: fileObj.name,
              fileSizeBytes: fileObj.size,
              contentType: fileObj.type,
              category,
              unitTypeId,
            }),
          }
        )

        if (!finalizeRes.ok) {
          const errorData = await finalizeRes.json().catch(() => ({ message: 'Failed to finalize upload' }))
          throw new Error(errorData.message || 'Failed to finalize upload')
        }

        const finalData = await finalizeRes.json()
        updateFileState(fileId, 'completed', 100)
        onSuccess?.(finalData.media.id, s3Key)
      } catch (err: any) {
        const errorMsg = err.message || 'Upload failed'
        updateFileState(fileId, 'upload_failed', 0, errorMsg)
        onError?.(fileId, errorMsg)
      }
    },
    [projectId, category, unitTypeId, updateFileState, onSuccess, onError]
  )

  const addFiles = useCallback(
    (filesToAdd: File[]) => {
      const newEntries: { id: string; file: File }[] = []
      const newMap = new Map(filesRef.current)

      filesToAdd.forEach((file) => {
        const id = Math.random().toString(36).slice(2)
        newMap.set(id, {
          id,
          file,
          state: 'selected',
          progress: 0,
        })
        newEntries.push({ id, file })
      })

      setFilesAndRef(newMap)

      // Auto-start upload — pass File object directly to avoid stale closure
      for (const entry of newEntries) {
        void doUpload(entry.id, entry.file)
      }
    },
    [setFilesAndRef, doUpload]
  )

  const removeFile = useCallback((fileId: string) => {
    setFilesAndRef((prev) => {
      const next = new Map(prev)
      next.delete(fileId)
      return next
    })
  }, [setFilesAndRef])

  const retryFile = useCallback(
    (fileId: string) => {
      const fileData = filesRef.current.get(fileId)
      if (!fileData) return
      updateFileState(fileId, 'selected', 0)
      void doUpload(fileId, fileData.file)
    },
    [updateFileState, doUpload]
  )

  const uploadFile = useCallback(
    (fileId: string) => {
      const fileData = filesRef.current.get(fileId)
      if (!fileData) return
      void doUpload(fileId, fileData.file)
    },
    [doUpload]
  )

  return {
    files: Array.from(files.values()),
    addFiles,
    removeFile,
    retryFile,
    uploadFile,
  }
}

/**
 * Hook for managing brochure upload (similar but for single file)
 */
export interface UseBrochureUploadOptions {
  projectId: string
  onSuccess?: (s3Key: string, fileName: string, fileSize: number) => void
  onError?: (error: string) => void
}

export function useBrochureUpload({ projectId, onSuccess, onError }: UseBrochureUploadOptions) {
  const [state, setState] = useState<UploadFileState>('selected')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string>()
  const [presignedUrl, setPresignedUrl] = useState<string>()
  const [s3Key, setS3Key] = useState<string>()

  const uploadBrochure = useCallback(
    async (file: File) => {
      try {
        // Step 1: Validation
        if (file.type !== 'application/pdf') {
          throw new Error('Only PDF files are allowed')
        }

        setState('requesting')
        setProgress(0)
        setError(undefined)

        // Step 2: Request presigned URL
        const presignRes = await fetch(
          `/api/admin/projects/${projectId}/brochure/presign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileSizeBytes: file.size,
              contentType: file.type,
            }),
          }
        )

        if (!presignRes.ok) {
          const errorData = await presignRes.json()
          throw new Error(errorData.message || 'Failed to get upload URL')
        }

        const presignData = await presignRes.json()
        setPresignedUrl(presignData.uploadUrl)
        setS3Key(presignData.s3Key)
        setState('authorized')
        setProgress(20)

        // Step 3: Upload to S3
        setState('uploading')
        const uploadRes = await fetch(presignData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!uploadRes.ok) {
          throw new Error(`Upload failed with status ${uploadRes.status}`)
        }

        setState('uploaded')
        setProgress(80)

        // Step 4: Finalize in database
        setState('finalizing')
        const finalizeRes = await fetch(
          `/api/admin/projects/${projectId}/brochure/finalize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              s3Key: presignData.s3Key,
              fileName: file.name,
              fileSizeBytes: file.size,
            }),
          }
        )

        if (!finalizeRes.ok) {
          const errorData = await finalizeRes.json()
          throw new Error(errorData.message || 'Failed to finalize upload')
        }

        setState('completed')
        setProgress(100)
        onSuccess?.(presignData.s3Key, file.name, file.size)
      } catch (err: any) {
        const errorMsg = err.message || 'Upload failed'
        setState('upload_failed')
        setError(errorMsg)
        onError?.(errorMsg)
      }
    },
    [projectId, onSuccess, onError]
  )

  const retry = useCallback(() => {
    setState('selected')
    setProgress(0)
    setError(undefined)
  }, [])

  const reset = useCallback(() => {
    setState('selected')
    setProgress(0)
    setError(undefined)
    setPresignedUrl(undefined)
    setS3Key(undefined)
  }, [])

  return {
    state,
    progress,
    error,
    uploadBrochure,
    retry,
    reset,
  }
}

