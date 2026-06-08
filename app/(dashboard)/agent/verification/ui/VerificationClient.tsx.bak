'use client'

import React, { useState, useEffect } from 'react'

type DocumentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type AgentDocument = {
  id: string
  type: string
  fileUrl: string
  status: DocumentStatus
  rejectionReason: string | null
}

const REQUIRED_DOCS = [
  { type: 'GOVERNMENT_ID', label: 'Government ID', desc: 'Passport, Emirates ID, etc.' },
  { type: 'REAL_ESTATE_LICENSE', label: 'Real Estate License', desc: 'RERA or equivalent' },
]

const OPTIONAL_DOCS = [
  { type: 'SELFIE_VERIFICATION', label: 'Selfie with ID', desc: 'Optional but speeds up review' },
  { type: 'ADDRESS_PROOF', label: 'Address Proof', desc: 'Utility bill, etc.' },
  { type: 'AGENCY_CERTIFICATE', label: 'Agency Certificate', desc: 'If applicable' },
]

export default function VerificationClient() {
  const [documents, setDocuments] = useState<AgentDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<string | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/agent/documents')
      const data = await res.json()
      if (res.ok) setDocuments(data.documents || [])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(docType)
    try {
      // 1. Get presigned URL (assuming existing system is S3 based like the rest of the app)
      const presignedRes = await fetch('/api/media/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder: 'agent-docs' })
      })

      if (!presignedRes.ok) throw new Error('Failed to get upload URL')
      const { url, key, fileUrl } = await presignedRes.json()

      // 2. Upload to S3
      await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })

      // 3. Save to database
      const saveRes = await fetch('/api/agent/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentType: docType, fileUrl })
      })

      if (saveRes.ok) await fetchDocuments()
    } catch (err) {
      alert('Upload failed. Please try again.')
    } finally {
      setUploading(null)
    }
  }

  const renderDocCard = (def: { type: string; label: string; desc: string }, required: boolean) => {
    const doc = documents.find((d) => d.type === def.type)

    return (
      <div key={def.type} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white border border-gray-100 rounded-2xl shadow-sm gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-dark-blue">{def.label}</h3>
            {required && <span className="text-[10px] uppercase font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Required</span>}
          </div>
          <p className="text-sm text-gray-500">{def.desc}</p>
        </div>

        <div className="flex items-center gap-4">
          {doc ? (
            <div className="flex flex-col items-end">
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
                doc.status === 'APPROVED' ? 'bg-green-50 text-green-600' :
                doc.status === 'REJECTED' ? 'bg-red-50 text-red-600' :
                'bg-yellow-50 text-yellow-600'
              }`}>
                {doc.status}
              </span>
              {doc.status === 'REJECTED' && (
                <p className="text-xs text-red-500 mt-1 max-w-[200px] text-right">
                  {doc.rejectionReason || 'Please upload a clearer image.'}
                </p>
              )}
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full">Missing</span>
          )}

          <label className="cursor-pointer relative overflow-hidden group">
            <input 
              type="file" 
              accept="image/*,.pdf" 
              onChange={(e) => handleUpload(e, def.type)} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading === def.type || doc?.status === 'APPROVED'}
            />
            <div className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              uploading === def.type ? 'bg-gray-100 text-gray-500' :
              doc?.status === 'APPROVED' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' :
              doc ? 'bg-gray-50 text-dark-blue border border-gray-200 hover:bg-gray-100' :
              'bg-dark-blue text-white hover:bg-dark-blue/90'
            }`}>
              {uploading === def.type ? 'Uploading...' : doc ? 'Update File' : 'Upload'}
            </div>
          </label>
        </div>
      </div>
    )
  }

  if (loading) return <div className="p-8"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-8"></div></div>

  const allRequiredApproved = REQUIRED_DOCS.every((req) => 
    documents.some((d) => d.type === req.type && d.status === 'APPROVED')
  )

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-dark-blue mb-2">Verification Center</h1>
        <p className="text-gray-600">Upload your professional documents to get approved and start listing properties.</p>
      </div>

      {allRequiredApproved && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-xl flex items-start gap-4">
          <svg className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-semibold">All Required Documents Approved</h4>
            <p className="text-sm mt-1 opacity-90">Your mandatory documents have been accepted. Your profile is ready for final admin review.</p>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-lg font-bold text-dark-blue mb-4">Required Documents</h2>
        <div className="space-y-3">
          {REQUIRED_DOCS.map(doc => renderDocCard(doc, true))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-dark-blue mb-4">Optional Documents</h2>
        <div className="space-y-3">
          {OPTIONAL_DOCS.map(doc => renderDocCard(doc, false))}
        </div>
      </section>
    </div>
  )
}
