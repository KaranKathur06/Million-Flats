import React, { useState } from 'react'

interface CloudinaryUploadProps {
  onUpload: (url: string, altText: string) => void
}

export const CloudinaryUpload: React.FC<CloudinaryUploadProps> = ({ onUpload }) => {
  const [preview, setPreview] = useState<string | null>(null)
  const [altText, setAltText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const uploadImage = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadError(null)

      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result
          if (typeof result === 'string') resolve(result)
          else reject(new Error('Failed to read image'))
        }
        reader.onerror = () => reject(new Error('Failed to read image'))
        reader.readAsDataURL(file)
      })

      onUpload(dataUrl, altText)
      setPreview(dataUrl)
      setAltText('')
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadError('Upload failed. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <label htmlFor="file" className="flex items-center">
          <input
            type="file"
            id="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                uploadImage(file)
              }
            }}
            className="border-2 border-dashed hover:border-blue-500 cursor-pointer"
          />
          <div className="ml-2">
            <p className="text-sm">Drag & drop or click to upload</p>
            <p className="text-xs text-gray-500">PNG, JPG, WebP (2MB max)</p>
          </div>
        </label>
      </div>

      {isUploading && (
        <div className="text-sm text-gray-500">Uploading...</div>
      )}

      {preview && (
        <div className="mt-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <img
              src={preview}
              alt="Preview"
              className="w-full rounded-lg shadow-lg"
            />
          </div>
          <div className="mt-2">
            <label htmlFor="altText" className="block text-sm font-medium text-gray-700 mb-1">
              Alt Text
            </label>
            <input
              type="text"
              id="altText"
              name="altText"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Alt text for accessibility"
            />
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mt-4">
          <div className="text-red-500">Error: {uploadError}</div>
        </div>
      )}
    </div>
  )
}
