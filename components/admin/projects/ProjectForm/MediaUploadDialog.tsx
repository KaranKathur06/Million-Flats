'use client'

import { MediaUploadDialog as SharedMediaUploadDialog } from '@/components/media/MediaUploadDialog'

const PROJECT_MEDIA_CATEGORIES = [
  { value: 'hero', label: 'Hero' },
  { value: 'other', label: 'Other' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'lifestyle', label: 'Lifestyle' },
]

export function MediaUploadDialog({ projectId, isOpen, onClose, onComplete }: { projectId: string; isOpen: boolean; onClose: () => void; onComplete?: () => void }) {
  return <SharedMediaUploadDialog entityId={projectId} title="Project" categories={PROJECT_MEDIA_CATEGORIES} presignEndpoint={`/api/admin/projects/${projectId}/media/presign`} finalizeEndpoint={`/api/admin/projects/${projectId}/media/finalize`} buildPresignBody={(file, category) => ({ fileName: file.name, fileSizeBytes: file.size, contentType: file.type, category })} buildFinalizeBody={(file, category, s3Key) => ({ s3Key, fileName: file.name, fileSizeBytes: file.size, contentType: file.type, category })} isOpen={isOpen} onClose={onClose} onComplete={() => onComplete?.()} />
}
