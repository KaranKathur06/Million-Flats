'use client'

import { useEffect, useMemo, useState } from 'react'
import PdfDropzone, { type FileMeta } from '@/components/upload/PdfDropzone'

type LeadMagnetStatus = 'draft' | 'uploaded' | 'published' | 'active'

type LeadMagnetItem = {
  id: string
  slug: string
  title: string
  subtitle: string
  ctaLabel: string
  loginHint: string
  badgeText: string
  fileS3Key: string
  status: LeadMagnetStatus
  hasFile: boolean
  isActive: boolean
  popupEnabled: boolean
  popupDelaySeconds: number
  popupScrollPercent: number
  cooldownHours: number
  sortOrder: number
  downloadsCount: number
}

type ToastState = { type: 'success' | 'error'; message: string } | null

type EditorState = {
  id: string | null
  slug: string
  title: string
  subtitle: string
  ctaLabel: string
  loginHint: string
  badgeText: string
  popupDelaySeconds: number
  popupScrollPercent: number
  cooldownHours: number
  sortOrder: number
  popupEnabled: boolean
  isActive: boolean
  fileS3Key: string
}

const INITIAL_FORM: EditorState = {
  id: null,
  slug: 'dubai-real-estate-investor-guide',
  title: 'Dubai Real Estate Investor Guide (Free)',
  subtitle: 'Avoid 7 costly mistakes NRIs make and unlock practical market insights.',
  ctaLabel: 'Download Free Guide',
  loginHint: 'Login required',
  badgeText: 'Exclusive for Registered Users',
  popupDelaySeconds: 4,
  popupScrollPercent: 25,
  cooldownHours: 24,
  sortOrder: 0,
  popupEnabled: false,
  isActive: false,
  fileS3Key: '',
}

const STATUS_CLASS: Record<LeadMagnetStatus, string> = {
  draft: 'bg-slate-500/15 text-slate-300 border-slate-400/20',
  uploaded: 'bg-sky-500/15 text-sky-300 border-sky-400/20',
  published: 'bg-amber-500/15 text-amber-300 border-amber-400/20',
  active: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
}

export default function LeadMagnetSettingsClient() {
  const [items, setItems] = useState<LeadMagnetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [removingFile, setRemovingFile] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [form, setForm] = useState<EditorState>(INITIAL_FORM)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  async function loadData(nextSelectedId?: string | null) {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/lead-magnets', { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to load lead magnets')
      }

      const nextItems = Array.isArray(json.data) ? (json.data as LeadMagnetItem[]) : []
      setItems(nextItems)

      const selectedId = nextSelectedId === undefined ? form.id : nextSelectedId
      if (selectedId) {
        const selected = nextItems.find((item) => item.id === selectedId)
        if (selected) {
          setForm(mapItemToForm(selected))
          return
        }
      }

      if (!selectedId) {
        setForm((prev) => ({ ...prev, fileS3Key: '' }))
      }
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load lead magnets' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData(null)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const totalDownloads = useMemo(() => items.reduce((acc, item) => acc + Number(item.downloadsCount || 0), 0), [items])
  const editingItem = useMemo(() => items.find((item) => item.id === form.id) || null, [items, form.id])
  const fileMeta = useMemo<FileMeta | null>(() => {
    if (pdfFile) {
      return {
        name: pdfFile.name,
        size: pdfFile.size,
        url: URL.createObjectURL(pdfFile),
      }
    }
    if (editingItem?.fileS3Key) {
      return {
        name: editingItem.fileS3Key.split('/').pop() || 'lead-magnet.pdf',
        size: 0,
        url: null,
      }
    }
    return null
  }, [editingItem?.fileS3Key, pdfFile])

  useEffect(() => {
    return () => {
      if (fileMeta?.url?.startsWith('blob:')) {
        URL.revokeObjectURL(fileMeta.url)
      }
    }
  }, [fileMeta])

  function mapItemToForm(item: LeadMagnetItem): EditorState {
    return {
      id: item.id,
      slug: item.slug,
      title: item.title,
      subtitle: item.subtitle,
      ctaLabel: item.ctaLabel,
      loginHint: item.loginHint,
      badgeText: item.badgeText,
      popupDelaySeconds: item.popupDelaySeconds,
      popupScrollPercent: item.popupScrollPercent,
      cooldownHours: item.cooldownHours,
      sortOrder: item.sortOrder,
      popupEnabled: item.popupEnabled,
      isActive: item.isActive,
      fileS3Key: item.fileS3Key,
    }
  }

  function resetEditor() {
    setForm(INITIAL_FORM)
    setPdfFile(null)
  }

  async function saveDraft() {
    if (!form.slug.trim() || !form.title.trim()) {
      setToast({ type: 'error', message: 'Slug and title are required.' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        slug: form.slug.trim().toLowerCase(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        ctaLabel: form.ctaLabel.trim(),
        loginHint: form.loginHint.trim(),
        badgeText: form.badgeText.trim(),
        popupDelaySeconds: form.popupDelaySeconds,
        popupScrollPercent: form.popupScrollPercent,
        cooldownHours: form.cooldownHours,
        sortOrder: form.sortOrder,
        popupEnabled: form.popupEnabled,
        isActive: form.isActive,
      }

      const endpoint = form.id ? `/api/admin/lead-magnets/${form.id}` : '/api/admin/lead-magnets'
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to save draft')
      }

      const nextId = String(json?.data?.id || form.id || '') || null
      setToast({ type: 'success', message: form.id ? 'Lead magnet updated.' : 'Draft created.' })
      await loadData(nextId)
      if (nextId) {
        const nextItem = (json?.data?.id ? { ...payload, id: nextId } : null)
        if (!form.id && nextItem) {
          setForm((prev) => ({ ...prev, id: nextId }))
        }
      }
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to save draft' })
    } finally {
      setSaving(false)
    }
  }

  async function removeStoredFile() {
    if (!form.id) {
      setPdfFile(null)
      return
    }

    setRemovingFile(true)
    try {
      const res = await fetch(`/api/admin/lead-magnets/${form.id}/upload`, {
        method: 'DELETE',
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to remove file')
      }

      setPdfFile(null)
      setToast({ type: 'success', message: 'Stored PDF removed. Lead magnet is back in draft state.' })
      await loadData(form.id)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to remove file' })
    } finally {
      setRemovingFile(false)
    }
  }

  async function uploadSelectedFile() {
    if (!form.id) {
      setToast({ type: 'error', message: 'Create the draft before uploading a PDF.' })
      return
    }
    if (!pdfFile) {
      setToast({ type: 'error', message: 'Select a PDF first.' })
      return
    }

    setUploading(true)
    try {
      const fd = new FormData()
      fd.set('file', pdfFile)
      const res = await fetch(`/api/admin/lead-magnets/${form.id}/upload`, {
        method: 'POST',
        body: fd,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to upload file')
      }

      setPdfFile(null)
      setToast({ type: 'success', message: 'PDF uploaded successfully.' })
      await loadData(form.id)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to upload file' })
    } finally {
      setUploading(false)
    }
  }

  async function setLifecycle(next: Partial<LeadMagnetItem>, successMessage: string) {
    if (!form.id) {
      setToast({ type: 'error', message: 'Select a lead magnet first.' })
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/admin/lead-magnets/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to update lead magnet')
      }

      setToast({ type: 'success', message: successMessage })
      await loadData(form.id)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update lead magnet' })
    } finally {
      setSaving(false)
    }
  }

  async function deleteLeadMagnet(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/lead-magnets/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to delete lead magnet')
      }
      if (form.id === id) {
        resetEditor()
      }
      setToast({ type: 'success', message: 'Lead magnet deleted.' })
      await loadData(form.id === id ? null : form.id)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete lead magnet' })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${toast.type === 'success' ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-200' : 'border-red-300/40 bg-red-500/10 text-red-200'}`}>
          {toast.message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Lead Magnets</h2>
            <p className="mt-1 text-sm text-white/55">Drafts, uploads, publishing, activation, and secure file lifecycle in one place.</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-wider text-white/40">Total Downloads</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalDownloads}</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Create / Edit Panel</h3>
            <button
              type="button"
              onClick={resetEditor}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/5"
            >
              New Draft
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') }))} className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white" placeholder="slug" />
            <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white" placeholder="title" />
            <input value={form.ctaLabel} onChange={(e) => setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))} className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white" placeholder="CTA label" />
            <input value={form.loginHint} onChange={(e) => setForm((prev) => ({ ...prev, loginHint: e.target.value }))} className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white" placeholder="login hint" />
            <input value={form.badgeText} onChange={(e) => setForm((prev) => ({ ...prev, badgeText: e.target.value }))} className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white" placeholder="badge text" />
            <input value={form.sortOrder} onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value || 0) }))} type="number" className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white" placeholder="sort order" />
            <textarea value={form.subtitle} onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))} className="md:col-span-2 min-h-[96px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" placeholder="description" />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-[#0b1220] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-white/45">Upload Section</p>
                <p className="mt-1 text-xs text-white/45">Create draft first. Then upload or replace the PDF without recreating the entity.</p>
              </div>
              {editingItem ? (
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASS[editingItem.status]}`}>
                  {editingItem.status}
                </span>
              ) : null}
            </div>

            <PdfDropzone
              value={fileMeta}
              loading={saving || uploading || removingFile}
              onUpload={async (file) => {
                setPdfFile(file)
              }}
              onDelete={async () => {
                if (pdfFile) {
                  setPdfFile(null)
                  return
                }

                if (editingItem?.fileS3Key) {
                  await removeStoredFile()
                }
              }}
            />

            {editingItem?.fileS3Key ? <p className="mt-3 truncate text-xs text-white/35">Stored key: {editingItem.fileS3Key}</p> : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={saving} onClick={saveDraft} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#111827] disabled:opacity-50">
              {saving ? 'Saving...' : form.id ? 'Update Draft' : 'Save Draft'}
            </button>
            <button type="button" disabled={!form.id || !pdfFile || uploading || removingFile} onClick={uploadSelectedFile} className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-[#111827] disabled:opacity-50">
              {uploading ? 'Uploading...' : editingItem?.hasFile ? 'Replace File' : 'Upload File'}
            </button>
            <button type="button" disabled={!form.id || (!editingItem?.hasFile && !pdfFile) || removingFile || uploading} onClick={() => { if (pdfFile) { setPdfFile(null); return } void removeStoredFile() }} className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-50">
              {removingFile ? 'Removing File...' : pdfFile ? 'Clear Selected File' : 'Remove File'}
            </button>
            <button type="button" disabled={!form.id} onClick={() => void setLifecycle({ popupEnabled: true, isActive: false }, 'Lead magnet published.')} className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 disabled:opacity-50">
              Publish
            </button>
            <button type="button" disabled={!form.id} onClick={() => void setLifecycle({ popupEnabled: true, isActive: true }, 'Lead magnet activated.')} className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 disabled:opacity-50">
              Activate
            </button>
            <button type="button" disabled={!form.id} onClick={() => void setLifecycle({ isActive: false, popupEnabled: false }, 'Lead magnet moved back to uploaded state.')} className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/75 disabled:opacity-50">
              Unpublish
            </button>
            <button type="button" disabled={!form.id || deletingId === form.id} onClick={() => form.id && void deleteLeadMagnet(form.id)} className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 disabled:opacity-50">
              {deletingId === form.id ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Existing Lead Magnets</h3>
          {loading ? (
            <p className="mt-4 text-sm text-white/60">Loading...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-white/60">No lead magnets configured yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {items.map((item) => {
                const isSelected = item.id === form.id
                return (
                  <div key={item.id} className={`rounded-xl border p-4 transition ${isSelected ? 'border-amber-400/35 bg-amber-400/5' : 'border-white/10 bg-white/[0.03]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-0.5 text-xs text-white/45">/{item.slug} · downloads: {item.downloadsCount}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLASS[item.status]}`}>{item.status}</span>
                          <span className="text-[11px] text-white/35">{item.hasFile ? 'File attached' : 'No file'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setForm(mapItemToForm(item)); setPdfFile(null) }} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/5">Edit</button>
                        <button type="button" disabled={deletingId === item.id} onClick={() => void deleteLeadMagnet(item.id)} className="rounded-lg border border-red-400/25 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50">Delete</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
