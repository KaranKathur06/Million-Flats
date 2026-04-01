'use client'

import { useEffect, useMemo, useState } from 'react'
import FileUploadBox from '@/components/admin/FileUploadBox'

type LeadMagnetItem = {
  id: string
  slug: string
  title: string
  subtitle: string
  ctaLabel: string
  loginHint: string
  badgeText: string
  fileS3Key: string
  isActive: boolean
  popupEnabled: boolean
  popupDelaySeconds: number
  popupScrollPercent: number
  cooldownHours: number
  sortOrder: number
  downloadsCount: number
}

type ToastState = { type: 'success' | 'error'; message: string } | null

export default function LeadMagnetSettingsClient() {
  const [items, setItems] = useState<LeadMagnetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [creating, setCreating] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)

  const [newForm, setNewForm] = useState({
    slug: 'dubai-real-estate-investor-guide',
    title: 'Dubai Real Estate Investor Guide (Free)',
    subtitle: 'Avoid 7 costly mistakes NRIs make and unlock practical market insights.',
    ctaLabel: 'Download Free Guide',
    loginHint: 'Login required',
    badgeText: 'Exclusive for Registered Users',
    isActive: true,
    popupEnabled: true,
    popupDelaySeconds: 4,
    popupScrollPercent: 25,
    cooldownHours: 24,
    sortOrder: 0,
  })

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/lead-magnets', { cache: 'no-store' })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.success) {
        setItems(Array.isArray(json.data) ? json.data : [])
      } else {
        setToast({ type: 'error', message: json?.message || 'Failed to load lead magnets' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to load lead magnets' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(t)
  }, [toast])

  const totalDownloads = useMemo(() => items.reduce((acc, item) => acc + Number(item.downloadsCount || 0), 0), [items])

  async function createLeadMagnet() {
    if (!pdfFile) {
      setToast({ type: 'error', message: 'Please select a PDF before saving.' })
      return
    }

    setCreating(true)
    try {
      const fd = new FormData()
      fd.set('file', pdfFile)
      fd.set('slug', newForm.slug)
      fd.set('title', newForm.title)
      fd.set('subtitle', newForm.subtitle)
      fd.set('ctaLabel', newForm.ctaLabel)
      fd.set('loginHint', newForm.loginHint)
      fd.set('badgeText', newForm.badgeText)
      fd.set('isActive', String(newForm.isActive))
      fd.set('popupEnabled', String(newForm.popupEnabled))
      fd.set('popupDelaySeconds', String(newForm.popupDelaySeconds))
      fd.set('popupScrollPercent', String(newForm.popupScrollPercent))
      fd.set('cooldownHours', String(newForm.cooldownHours))
      fd.set('sortOrder', String(newForm.sortOrder))

      const res = await fetch('/api/admin/lead-magnets', {
        method: 'POST',
        body: fd,
      })

      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to create lead magnet')
      }

      setPdfFile(null)
      setToast({ type: 'success', message: 'Lead magnet uploaded and created successfully.' })
      await loadData()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Create failed' })
    } finally {
      setCreating(false)
    }
  }

  async function patchItem(id: string, data: Partial<LeadMagnetItem>) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/admin/lead-magnets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to update')
      }
      setToast({ type: 'success', message: 'Lead magnet updated' })
      await loadData()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Update failed' })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${toast.type === 'success' ? 'border-emerald-300/40 bg-emerald-500/10 text-emerald-200' : 'border-red-300/40 bg-red-500/10 text-red-200'}`}
        >
          {toast.message}
        </div>
      ) : null}

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h2 className="text-lg font-semibold text-white">Lead Magnets</h2>
        <p className="mt-1 text-sm text-white/55">
          Manage all downloadable assets (FAQ guides, investor reports, brochures). Total downloads tracked:{' '}
          <span className="font-semibold text-white">{totalDownloads}</span>
        </p>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Create New Lead Magnet</h3>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <input
            value={newForm.slug}
            onChange={(e) => setNewForm((p) => ({ ...p, slug: e.target.value.trim().toLowerCase().replace(/\s+/g, '-') }))}
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
            placeholder="slug"
          />
          <input
            value={newForm.title}
            onChange={(e) => setNewForm((p) => ({ ...p, title: e.target.value }))}
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
            placeholder="title"
          />
          <input
            value={newForm.ctaLabel}
            onChange={(e) => setNewForm((p) => ({ ...p, ctaLabel: e.target.value }))}
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
            placeholder="CTA label"
          />
          <input
            value={newForm.loginHint}
            onChange={(e) => setNewForm((p) => ({ ...p, loginHint: e.target.value }))}
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
            placeholder="login hint"
          />
          <input
            value={newForm.badgeText}
            onChange={(e) => setNewForm((p) => ({ ...p, badgeText: e.target.value }))}
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
            placeholder="badge text"
          />
          <input
            value={newForm.sortOrder}
            onChange={(e) => setNewForm((p) => ({ ...p, sortOrder: Number(e.target.value || 0) }))}
            type="number"
            className="h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white"
            placeholder="sort order"
          />
          <textarea
            value={newForm.subtitle}
            onChange={(e) => setNewForm((p) => ({ ...p, subtitle: e.target.value }))}
            className="md:col-span-2 min-h-[88px] rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            placeholder="subtitle"
          />
        </div>

        <div className="mt-4">
          <FileUploadBox type="pdf" maxSizeMB={10} file={pdfFile} onFileChange={setPdfFile} disabled={creating} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={creating || !newForm.slug || !newForm.title || !pdfFile}
            onClick={createLeadMagnet}
            className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-[#111827] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creating ? 'Saving...' : 'Save Lead Magnet'}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Existing Lead Magnets</h3>
        {loading ? (
          <p className="mt-4 text-sm text-white/60">Loading...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">No lead magnets configured yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-white/45">/{item.slug} · downloads: {item.downloadsCount}</p>
                    <p className="mt-1 truncate text-[11px] text-white/35">{item.fileS3Key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => patchItem(item.id, { popupEnabled: !item.popupEnabled })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${item.popupEnabled ? 'bg-emerald-500/20 text-emerald-200' : 'bg-white/10 text-white/70'}`}
                    >
                      Popup {item.popupEnabled ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      disabled={savingId === item.id}
                      onClick={() => patchItem(item.id, { isActive: !item.isActive })}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${item.isActive ? 'bg-blue-500/20 text-blue-200' : 'bg-white/10 text-white/70'}`}
                    >
                      {item.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

