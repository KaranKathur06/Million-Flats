import React, { useEffect, useMemo, useState } from 'react'

interface CloudinaryUploadProps {
  onUpload: (url: string, altText: string) => void
  titleOrSlug?: string
  initialUrl?: string
  initialAlt?: string
}

export const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({ onUpload, titleOrSlug, initialUrl, initialAlt }) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(initialUrl || null)
  const [altText, setAltText] = useState(initialAlt || '')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const effectivePreview = useMemo(() => preview || uploadedUrl, [preview, uploadedUrl])

  useEffect(() => {
    if (initialUrl) setUploadedUrl(initialUrl)
    if (typeof initialAlt === 'string') setAltText(initialAlt)
  }, [initialUrl, initialAlt])

  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadError(null)

      const prepRes = await fetch('/api/admin/blogs/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          title: titleOrSlug || undefined,
          slug: titleOrSlug || undefined,
        }),
      })

      const prepJson = await prepRes.json().catch(() => null)
      if (!prepRes.ok || !prepJson?.success) {
        throw new Error(prepJson?.message || 'Failed to prepare upload')
      }

      const uploadRes = await fetch(String(prepJson.uploadUrl), {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage')
      }

      const url = String(prepJson.publicUrl || prepJson.objectUrl || '').trim()
      if (!url) {
        throw new Error('Upload did not return a valid file URL')
      }

      const objectPreview = URL.createObjectURL(file)
      setPreview(objectPreview)
      setUploadedUrl(url)
      onUpload(url, altText)
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadError(error instanceof Error ? error.message : 'Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor="blog-image-upload"
        className={`group relative flex flex-col items-center justify-center w-full h-36 rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer ${
          isUploading
            ? 'border-amber-400/30 bg-amber-400/[0.03]'
            : 'border-white/[0.1] bg-white/[0.02] hover:border-amber-400/30 hover:bg-amber-400/[0.03]'
        }`}
      >
        <input
          type="file"
          id="blog-image-upload"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              uploadImage(file)
            }
          }}
          className="sr-only"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="animate-spin h-8 w-8 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-amber-400 font-medium">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:bg-amber-400/10 group-hover:border-amber-400/20 transition-all duration-300">
              <svg className="h-5 w-5 text-white/40 group-hover:text-amber-400 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/60 group-hover:text-white/80 transition-colors">
                Click to upload or drag & drop
              </p>
              <p className="text-xs text-white/30 mt-0.5">PNG, JPG, WebP, AVIF (5MB max)</p>
            </div>
          </div>
        )}
      </label>

      {effectivePreview && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02]">
            <img src={effectivePreview} alt="Preview" className="w-full max-h-48 object-cover" />
          </div>
          <div>
            <label htmlFor="blog-alt-text" className="block text-xs font-medium text-white/50 mb-1.5">
              Alt Text (for accessibility & SEO)
            </label>
            <input
              type="text"
              id="blog-alt-text"
              name="altText"
              value={altText}
              onChange={(e) => {
                const next = e.target.value
                setAltText(next)
                if (uploadedUrl) {
                  onUpload(uploadedUrl, next)
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
              placeholder="Describe the image..."
            />
          </div>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <svg className="h-4 w-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-400">{uploadError}</p>
        </div>
      )}
    </div>
  )
}


