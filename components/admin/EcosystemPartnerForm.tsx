'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Category = { id: string; slug: string; title: string }

type PartnerFormData = {
  id?: string
  categoryId: string
  name: string
  slug: string
  tagline: string
  shortDescription: string
  description: string
  logo: string
  coverImage: string
  rating: string
  yearsExperience: string
  projectsCompleted: string
  teamSize: string
  partnerSince: string
  locationCoverage: string
  pricingRange: string
  status: string
  isFeatured: boolean
  isVerified: boolean
  isActive: boolean
  metaTitle: string
  metaDescription: string
}

const emptyForm: PartnerFormData = {
  categoryId: '',
  name: '',
  slug: '',
  tagline: '',
  shortDescription: '',
  description: '',
  logo: '',
  coverImage: '',
  rating: '',
  yearsExperience: '',
  projectsCompleted: '',
  teamSize: '',
  partnerSince: '',
  locationCoverage: '',
  pricingRange: '',
  status: 'PENDING',
  isFeatured: false,
  isVerified: false,
  isActive: true,
  metaTitle: '',
  metaDescription: '',
}

export default function EcosystemPartnerForm({
  categories,
  initial,
}: {
  categories: Category[]
  initial?: Partial<PartnerFormData> & { id?: string }
}) {
  const router = useRouter()
  const [form, setForm] = useState<PartnerFormData>({ ...emptyForm, ...initial })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = Boolean(initial?.id)

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const payload = {
      categoryId: form.categoryId,
      name: form.name,
      slug: form.slug || undefined,
      tagline: form.tagline || null,
      shortDescription: form.shortDescription || null,
      description: form.description || null,
      logo: form.logo || null,
      coverImage: form.coverImage || null,
      rating: form.rating ? Number(form.rating) : null,
      yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
      projectsCompleted: form.projectsCompleted ? Number(form.projectsCompleted) : null,
      teamSize: form.teamSize ? Number(form.teamSize) : null,
      partnerSince: form.partnerSince ? Number(form.partnerSince) : null,
      locationCoverage: form.locationCoverage || null,
      pricingRange: form.pricingRange || null,
      status: form.status,
      isFeatured: form.isFeatured,
      isVerified: form.isVerified,
      isActive: form.isActive,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
    }

    try {
      const url = isEdit
        ? `/api/admin/ecosystem-partners/manage/${initial!.id}`
        : '/api/admin/ecosystem-partners/manage'
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Save failed')
      router.push('/admin/ecosystem-partners/manage')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold text-white">Partner Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Category *</span>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              required
              className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-[#0b1220] px-3 text-sm text-white"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Company Name *</span>
            <input name="name" value={form.name} onChange={handleChange} required className="field" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Slug</span>
            <input name="slug" value={form.slug} onChange={handleChange} placeholder="auto-generated" className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Tagline</span>
            <input name="tagline" value={form.tagline} onChange={handleChange} className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Short Description</span>
            <input name="shortDescription" value={form.shortDescription} onChange={handleChange} className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Full Description</span>
            <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="field" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Logo URL</span>
            <input name="logo" value={form.logo} onChange={handleChange} className="field" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Cover Image URL</span>
            <input name="coverImage" value={form.coverImage} onChange={handleChange} className="field" />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold text-white">Stats & Coverage</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Rating</span>
            <input name="rating" value={form.rating} onChange={handleChange} type="number" step="0.1" min="0" max="5" className="field" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Experience (yrs)</span>
            <input name="yearsExperience" value={form.yearsExperience} onChange={handleChange} type="number" className="field" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Projects</span>
            <input name="projectsCompleted" value={form.projectsCompleted} onChange={handleChange} type="number" className="field" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Team Size</span>
            <input name="teamSize" value={form.teamSize} onChange={handleChange} type="number" className="field" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Partner Since</span>
            <input name="partnerSince" value={form.partnerSince} onChange={handleChange} type="number" className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Location Coverage</span>
            <input name="locationCoverage" value={form.locationCoverage} onChange={handleChange} placeholder="Delhi NCR, Mumbai, Bangalore" className="field" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Budget Range</span>
            <input name="pricingRange" value={form.pricingRange} onChange={handleChange} className="field" />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-bold text-white">Status & SEO</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-semibold text-white/60">Status</span>
            <select name="status" value={form.status} onChange={handleChange} className="field">
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-4 pt-6">
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" name="isVerified" checked={form.isVerified} onChange={handleChange} />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" name="isFeatured" checked={form.isFeatured} onChange={handleChange} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80">
              <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
              Active
            </label>
          </div>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Meta Title</span>
            <input name="metaTitle" value={form.metaTitle} onChange={handleChange} className="field" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs font-semibold text-white/60">Meta Description</span>
            <textarea name="metaDescription" value={form.metaDescription} onChange={handleChange} rows={2} className="field" />
          </label>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-11 items-center rounded-xl bg-accent-yellow px-6 text-sm font-semibold text-dark-blue disabled:opacity-60"
      >
        {saving ? 'Saving...' : isEdit ? 'Update Partner' : 'Create Partner'}
      </button>

      <style jsx>{`
        .field {
          margin-top: 0.25rem;
          height: 2.75rem;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #0b1220;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
        }
        textarea.field {
          height: auto;
          padding: 0.75rem;
        }
      `}</style>
    </form>
  )
}
