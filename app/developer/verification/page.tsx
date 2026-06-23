'use client'

import { useState } from 'react'
import Link from 'next/link'

const DOCUMENT_TYPES = [
  { key: 'RERA_CERTIFICATE', label: 'RERA Certificate', required: true, desc: 'RERA registration certificate from the relevant authority' },
  { key: 'REGISTRATION_CERTIFICATE', label: 'Company Registration Certificate', required: true, desc: 'Certificate of incorporation or business registration' },
  { key: 'AUTHORIZED_PERSON_ID', label: 'Authorized Person ID', required: true, desc: 'Government-issued ID of the authorized representative' },
  { key: 'GST_CERTIFICATE', label: 'GST Certificate', required: false, desc: 'GST registration certificate (if applicable)' },
  { key: 'PAN_CARD', label: 'PAN Card', required: false, desc: 'Company or proprietor PAN card' },
  { key: 'BROCHURE', label: 'Company Brochure', required: false, desc: 'Optional marketing brochure or company profile PDF' },
]

interface UploadState {
  [key: string]: { uploading: boolean; done: boolean; url?: string; error?: string }
}

export default function DeveloperVerificationPage() {
  const [uploads, setUploads] = useState<UploadState>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const setUpload = (key: string, val: Partial<UploadState[string]>) =>
    setUploads(prev => ({ ...prev, [key]: { ...prev[key], ...val } }))

  const handleFileChange = async (docType: string, file: File) => {
    setUpload(docType, { uploading: true, done: false, error: undefined })
    try {
      // 1. Get presigned S3 URL
      const presignRes = await fetch('/api/developer/documents/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: docType, fileName: file.name, mimeType: file.type }),
      })
      if (!presignRes.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl, fileUrl, s3Key } = await presignRes.json()

      // 2. Upload to S3
      const s3Res = await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!s3Res.ok) throw new Error('Upload failed')

      // 3. Save document record
      const saveRes = await fetch('/api/developer/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: docType, fileUrl, s3Key, fileName: file.name, mimeType: file.type, sizeBytes: file.size }),
      })
      if (!saveRes.ok) throw new Error('Failed to save document')

      setUpload(docType, { uploading: false, done: true, url: fileUrl })
    } catch (e: any) {
      setUpload(docType, { uploading: false, done: false, error: e.message || 'Upload failed' })
    }
  }

  const requiredDocs = DOCUMENT_TYPES.filter(d => d.required)
  const allRequiredDone = requiredDocs.every(d => uploads[d.key]?.done)

  const handleSubmitForReview = async () => {
    if (!allRequiredDone) { setError('Please upload all required documents before submitting.'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/developer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ _submitForReview: true }),
      })
      if (!res.ok) throw new Error('Submission failed')
      setSubmitted(true)
    } catch (e: any) {
      setError(e.message || 'Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Submitted for Review!</h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            Your documents have been submitted. Our team will review and verify your account within 1–3 business days. You&apos;ll receive an email notification once approved.
          </p>
          <Link href="/developer/on-hold" className="inline-flex items-center gap-2 px-5 py-2.5 bg-dark-blue text-white rounded-xl text-sm font-semibold hover:bg-dark-blue/90 transition-all">
            View Status →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Verification</h1>
        <p className="text-gray-500 text-sm mt-1">Upload your legal documents to get verified. Required documents are marked with <span className="text-red-500">*</span>.</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      <div className="space-y-4">
        {DOCUMENT_TYPES.map(doc => {
          const state = uploads[doc.key]
          return (
            <div key={doc.key} className={`bg-white rounded-2xl border p-5 transition-all ${state?.done ? 'border-emerald-200' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    {doc.label}
                    {doc.required && <span className="text-red-500 ml-1">*</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.desc}</p>
                </div>
                <div className="flex-shrink-0">
                  {state?.done ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Uploaded
                    </span>
                  ) : state?.uploading ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Uploading...
                    </span>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-dark-blue bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full transition-all">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      Upload
                      <input
                        type="file"
                        className="sr-only"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={e => { if (e.target.files?.[0]) handleFileChange(doc.key, e.target.files[0]) }}
                      />
                    </label>
                  )}
                </div>
              </div>
              {state?.error && <p className="text-xs text-red-600 mt-2">{state.error}</p>}
            </div>
          )
        })}
      </div>

      <div className="mt-6 pt-5 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {requiredDocs.filter(d => uploads[d.key]?.done).length}/{requiredDocs.length} required documents uploaded
          </p>
          <button
            onClick={handleSubmitForReview}
            disabled={!allRequiredDone || submitting}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20"
          >
            {submitting ? 'Submitting...' : 'Submit for Review →'}
          </button>
        </div>
      </div>
    </div>
  )
}
