'use client'

import { useCallback, useState } from 'react'

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
  onSuccess?: (mediaId: string, s3Key: string) => void
  onError?: (fileId: string, error: string) => void
}

/**
 * Hook for managing media file uploads with presigned URLs
 * Handles the complete state machine for each file
 */
export function useMediaUpload({ projectId, category, onSuccess, onError }: UseMediaUploadOptions) {
  const [files, setFiles] = useState<Map<string, UploadFile>>(new Map())

  const addFiles = useCallback(
    (filesToAdd: File[]) => {
      const newFiles = new Map(files)
      filesToAdd.forEach((file) => {
        const id = Math.random().toString(36).slice(2)
        newFiles.set(id, {
          id,
          file,
          state: 'selected',
          progress: 0,
        })
      })
      setFiles(newFiles)
      
      // Auto-start upload for each file
      filesToAdd.forEach((file) => {
        const id = Array.from(newFiles.keys()).find(
          (k) => newFiles.get(k)?.file === file
        )
        if (id) uploadFile(id)
      })
    },
    [files]
  )

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const next = new Map(prev)
      next.delete(fileId)
      return next
    })
  }, [])

  const updateFileState = useCallback((fileId: string, state: UploadFileState, progress = 0, error?: string) => {
    setFiles((prev) => {
      const next = new Map(prev)
      const f = next.get(fileId)
      if (f) {
        next.set(fileId, {
          ...f,
          state,
          progress,
          error,
        })
      }
      return next
    })
  }, [])

  const uploadFile = useCallback(
    async (fileId: string) => {
      const uploadFile = files.get(fileId)
      if (!uploadFile) return

      try {
        // Step 1: Validation
        updateFileState(fileId, 'requesting', 0)

        // Step 2: Request presigned URL
        updateFileState(fileId, 'requesting', 10)
        const presignRes = await fetch(
          `/api/admin/projects/${projectId}/media/presign`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: uploadFile.file.name,
              fileSizeBytes: uploadFile.file.size,
              contentType: uploadFile.file.type,
              category,
            }),
          }
        )

        if (!presignRes.ok) {
          const errorData = await presignRes.json()
          throw new Error(errorData.message || 'Failed to get upload URL')
        }

        const { uploadUrl, s3Key, expiresIn } = await presignRes.json()
        updateFileState(fileId, 'authorized', 20, undefined)
        updateFileState(fileId, 'uploading', 30)

        // Step 3: Upload to S3
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': uploadFile.file.type || 'application/octet-stream',
          },
          body: uploadFile.file,
        })

        if (!uploadRes.ok) {
          throw new Error(`Upload failed with status ${uploadRes.status}`)
        }

        updateFileState(fileId, 'uploaded', 80)

        // Step 4: Finalize in database
        updateFileState(fileId, 'finalizing', 90)
        const finalizeRes = await fetch(
          `/api/admin/projects/${projectId}/media/finalize`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              s3Key,
              fileName: uploadFile.file.name,
              fileSizeBytes: uploadFile.file.size,
              category,
            }),
          }
        )

        if (!finalizeRes.ok) {
          const errorData = await finalizeRes.json()
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
    [files, projectId, category, updateFileState, onSuccess, onError]
  )

  const retryFile = useCallback(
    (fileId: string) => {
      const fileData = files.get(fileId)
      if (!fileData) return

      updateFileState(fileId, 'selected', 0)
      uploadFile(fileId)
    },
    [files, updateFileState, uploadFile]
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
