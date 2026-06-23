'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PROPERTY_TYPES = ['RESIDENTIAL', 'COMMERCIAL', 'VILLA', 'TOWNSHIP', 'MIXED_USE', 'OFFICE', 'RETAIL', 'LUXURY', 'AFFORDABLE']
const CURRENCIES = ['AED', 'INR', 'USD', 'GBP', 'EUR']
const TABS = ['Basic', 'Pricing', 'Details', 'Media', 'SEO']

export default function ProjectCreatePage() {
  const router = useRouter()
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Basic
    name: '', description: '', city: '', locality: '', country: 'UAE', propertyType: '',
    // Pricing
    startPrice: '', maxPrice: '', currency: 'AED', bookingAmount: '',
    // Details
    possessionDate: '', reraProjectNumber: '', configurations: '', totalUnits: '',
    // Media
    bannerUrl: '', videoUrl: '', brochureUrl: '',
    // SEO
    metaTitle: '', metaDescription: '',
  })

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const tf = (id: string, label: string, key: keyof typeof form, type = 'text', placeholder = '', required = false) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id} type={type} required={required}
        value={form[key]} onChange={e => set(key, e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all text-sm"
      />
    </div>
  )

  const handleCreate = async () => {
    if (!form.name.trim()) { setError('Project name is required.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/developer/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          startPrice: form.startPrice ? parseFloat(form.startPrice) : undefined,
          maxPrice: form.maxPrice ? parseFloat(form.maxPrice) : undefined,
          totalUnits: form.totalUnits ? parseInt(form.totalUnits) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data?.error || 'Failed to create project'); return }
      router.push(`/developer/projects/${data.project.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/developer/projects" className="text-gray-400 hover:text-gray-700 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Project</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {/* Tab 0: Basic */}
        {tab === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Basic Information</h2>
            {tf('pc-name', 'Project Name', 'name', 'text', 'e.g. Damac Islands', true)}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue focus:border-dark-blue transition-all text-sm resize-none"
                placeholder="Describe your project — location highlights, unique features, lifestyle..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {tf('pc-city', 'City', 'city', 'text', 'e.g. Dubai')}
              {tf('pc-locality', 'Locality / Area', 'locality', 'text', 'e.g. Damac Lagoons')}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                <select value={form.country} onChange={e => set('country', e.target.value)} className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue transition-all text-sm bg-white">
                  <option value="UAE">UAE</option>
                  <option value="INDIA">India</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Type</label>
                <select value={form.propertyType} onChange={e => set('propertyType', e.target.value)} className="w-full h-11 px-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue transition-all text-sm bg-white">
                  <option value="">Select type</option>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Pricing */}
        {tab === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Pricing</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
              <div className="flex gap-2">
                {CURRENCIES.map(c => (
                  <button key={c} type="button" onClick={() => set('currency', c)}
                    className={`px-4 py-2 rounded-xl text-sm border transition-all ${form.currency === c ? 'bg-dark-blue text-white border-dark-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {tf('pc-startprice', 'Starting Price', 'startPrice', 'number', '2400000')}
              {tf('pc-maxprice', 'Maximum Price', 'maxPrice', 'number', '8500000')}
            </div>
            {tf('pc-booking', 'Booking Amount', 'bookingAmount', 'number', '50000')}
          </div>
        )}

        {/* Tab 2: Details */}
        {tab === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Project Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {tf('pc-possession', 'Possession Date', 'possessionDate', 'date')}
              {tf('pc-units', 'Total Units', 'totalUnits', 'number', '500')}
            </div>
            {tf('pc-rera', 'RERA Project Number', 'reraProjectNumber', 'text', 'RERA project registration number')}
            {tf('pc-config', 'Configurations', 'configurations', 'text', 'e.g. 4BR Villa, 5BR Villa, Duplex')}
          </div>
        )}

        {/* Tab 3: Media */}
        {tab === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">Media</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-700">
              💡 You can add detailed media (gallery, 3D tours, floor plans, master plan) after creating the project.
            </div>
            {tf('pc-banner', 'Banner Image URL', 'bannerUrl', 'url', 'https://...')}
            {tf('pc-video', 'Video URL (YouTube/Vimeo)', 'videoUrl', 'url', 'https://youtube.com/...')}
            {tf('pc-brochure', 'Brochure PDF URL', 'brochureUrl', 'url', 'https://...')}
          </div>
        )}

        {/* Tab 4: SEO */}
        {tab === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900 mb-4">SEO</h2>
            {tf('pc-metatitle', 'Meta Title', 'metaTitle', 'text', 'Damac Islands | Luxury Villas in Dubai')}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Meta Description</label>
              <textarea value={form.metaDescription} onChange={e => set('metaDescription', e.target.value)} rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-dark-blue transition-all text-sm resize-none"
                placeholder="A brief description for search engines (150–160 characters)..." />
              <p className="text-xs text-gray-400 mt-1">{form.metaDescription.length}/160 characters</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6">
        <button onClick={() => setTab(t => Math.max(0, t - 1))} disabled={tab === 0}
          className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
          ← Back
        </button>
        {tab < TABS.length - 1 ? (
          <button onClick={() => setTab(t => t + 1)}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-dark-blue rounded-xl hover:bg-dark-blue/90 transition-all shadow-lg shadow-dark-blue/20">
            Next →
          </button>
        ) : (
          <button onClick={handleCreate} disabled={saving || !form.name.trim()}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2">
            {saving ? (<><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating...</>) : '✓ Create Project'}
          </button>
        )}
      </div>
    </div>
  )
}
