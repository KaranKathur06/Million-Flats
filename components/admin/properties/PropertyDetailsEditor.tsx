'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { CanonicalLocationFields } from './CanonicalLocationFields'

type EditableProperty = {
  id: string
  title: string | null
  propertyType: string | null
  intent: string | null
  price: number | null
  currency: string | null
  constructionStatus: string | null
  shortDescription: string | null
  bedrooms: number | null
  bathrooms: number | null
  squareFeet: number | null
  countryIso2: string | null
  city: string | null
  community: string | null
  address: string | null
  developerName: string | null
  latitude: number | null
  longitude: number | null
  paymentPlanText: string | null
  emiNote: string | null
  tour3dUrl: string | null
  status: string | null
}

const sectionClass = 'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5'
const inputClass = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/80 placeholder-white/20 outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/10'
const labelClass = 'text-[11px] font-medium uppercase tracking-wider text-white/35'

function toText(value: unknown) {
  return value === null || value === undefined ? '' : String(value)
}

function toNumberOrNull(value: string) {
  if (!value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function PropertyDetailsEditor({ property }: { property: EditableProperty }) {
  const [form, setForm] = useState({
    title: toText(property.title),
    propertyType: toText(property.propertyType),
    intent: toText(property.intent || 'SALE'),
    price: toText(property.price),
    currency: toText(property.currency || 'INR'),
    constructionStatus: toText(property.constructionStatus),
    shortDescription: toText(property.shortDescription),
    bedrooms: toText(property.bedrooms),
    bathrooms: toText(property.bathrooms),
    squareFeet: toText(property.squareFeet),
    countryIso2: toText(property.countryIso2 || 'IN'),
    city: toText(property.city),
    community: toText(property.community),
    address: toText(property.address),
    developerName: toText(property.developerName),
    latitude: toText(property.latitude),
    longitude: toText(property.longitude),
    paymentPlanText: toText(property.paymentPlanText),
    emiNote: toText(property.emiNote),
    tour3dUrl: toText(property.tour3dUrl),
    status: toText(property.status || 'APPROVED'),
  })
  const [saving, setSaving] = useState(false)

  function update(field: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: toNumberOrNull(form.price),
        bedrooms: Math.max(0, Math.trunc(toNumberOrNull(form.bedrooms) || 0)),
        bathrooms: Math.max(0, Math.trunc(toNumberOrNull(form.bathrooms) || 0)),
        squareFeet: Math.max(0, toNumberOrNull(form.squareFeet) || 0),
        latitude: toNumberOrNull(form.latitude),
        longitude: toNumberOrNull(form.longitude),
      }
      const response = await fetch(`/api/admin/properties/${property.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.message || 'Unable to save property')
      toast.success('Property updated')
    } catch (err: any) {
      toast.error(err.message || 'Unable to save property')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className={`${sectionClass} space-y-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/80">Property Details</h2>
          <p className="mt-1 text-xs text-white/40">Canonical country, city, and community are validated before saving.</p>
        </div>
        <button type="button" onClick={() => void save()} disabled={saving} className="min-h-11 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-black disabled:opacity-60">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2"><span className={labelClass}>Title</span><input className={inputClass} value={form.title} onChange={e => update('title', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Property Type</span><input className={inputClass} value={form.propertyType} onChange={e => update('propertyType', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Intent</span><select className={inputClass} value={form.intent} onChange={e => update('intent', e.target.value)}><option value="SALE">Sale</option><option value="RENT">Rent</option></select></label>
        <label className="space-y-2"><span className={labelClass}>Price</span><input className={inputClass} inputMode="decimal" value={form.price} onChange={e => update('price', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Currency</span><select className={inputClass} value={form.currency} onChange={e => update('currency', e.target.value)}><option value="INR">INR</option><option value="AED">AED</option><option value="USD">USD</option></select></label>
        <label className="space-y-2"><span className={labelClass}>Construction</span><select className={inputClass} value={form.constructionStatus} onChange={e => update('constructionStatus', e.target.value)}><option value="">Not set</option><option value="READY">Ready</option><option value="OFF_PLAN">Off-plan</option></select></label>
        <label className="space-y-2"><span className={labelClass}>Status</span><select className={inputClass} value={form.status} onChange={e => update('status', e.target.value)}><option value="DRAFT">Draft</option><option value="PENDING_REVIEW">Pending review</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option><option value="SOLD">Sold</option><option value="ARCHIVED">Archived</option></select></label>
      </div>

      <CanonicalLocationFields
        country={form.countryIso2}
        city={form.city}
        community={form.community}
        onChange={(patch) => setForm(prev => ({
          ...prev,
          countryIso2: patch.country ?? prev.countryIso2,
          city: patch.city ?? prev.city,
          community: patch.community ?? prev.community,
          currency: (patch.country ?? prev.countryIso2) === 'AE' ? 'AED' : prev.currency,
        }))}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <label className="space-y-2"><span className={labelClass}>Bedrooms</span><input className={inputClass} inputMode="numeric" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Bathrooms</span><input className={inputClass} inputMode="numeric" value={form.bathrooms} onChange={e => update('bathrooms', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Area</span><input className={inputClass} inputMode="decimal" value={form.squareFeet} onChange={e => update('squareFeet', e.target.value)} /></label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-2 md:col-span-2"><span className={labelClass}>Address</span><input className={inputClass} value={form.address} onChange={e => update('address', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Developer</span><input className={inputClass} value={form.developerName} onChange={e => update('developerName', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>3D Tour URL</span><input className={inputClass} value={form.tour3dUrl} onChange={e => update('tour3dUrl', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Latitude</span><input className={inputClass} inputMode="decimal" value={form.latitude} onChange={e => update('latitude', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Longitude</span><input className={inputClass} inputMode="decimal" value={form.longitude} onChange={e => update('longitude', e.target.value)} /></label>
        <label className="space-y-2 md:col-span-2"><span className={labelClass}>Description</span><textarea className={inputClass} rows={5} value={form.shortDescription} onChange={e => update('shortDescription', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>Payment Plan</span><textarea className={inputClass} rows={3} value={form.paymentPlanText} onChange={e => update('paymentPlanText', e.target.value)} /></label>
        <label className="space-y-2"><span className={labelClass}>EMI Note</span><textarea className={inputClass} rows={3} value={form.emiNote} onChange={e => update('emiNote', e.target.value)} /></label>
      </div>
    </section>
  )
}
