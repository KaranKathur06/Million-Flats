'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Plus, Search, X } from 'lucide-react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'

type Category = 'BUY' | 'RENT' | 'PROJECTS' | 'GENERIC'
type Banner = {
  id: string
  scope: 'CITY' | 'COUNTRY' | 'GLOBAL'
  category: Category
  cityId: string | null
  countryCode: 'INDIA' | 'UAE' | null
  city: { id: string; name: string; countryCode: 'INDIA' | 'UAE' } | null
  headline: string | null
  subheadline: string | null
  desktopImageUrl: string | null
  mobileImageUrl: string | null
  desktopWidth: number | null
  desktopHeight: number | null
  mobileWidth: number | null
  mobileHeight: number | null
  isActive: boolean
  updatedAt: string
}

const CATEGORY_LABEL: Record<Category, string> = { BUY: 'Buy', RENT: 'Rent', PROJECTS: 'Projects', GENERIC: 'Generic' }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export default function HeroBannerManagerClient() {
  const router = useRouter()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [preview, setPreview] = useState<{ banner: Banner; mobile: boolean } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/hero-banners', { cache: 'no-store' })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message || 'Unable to load hero banners.')
      setBanners(json.data || [])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load hero banners.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const toggleStatus = async (banner: Banner) => {
    setError('')
    try {
      const response = await fetch(`/api/admin/hero-banners/${banner.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !banner.isActive }),
      })
      const json = await response.json()
      if (!response.ok || !json.success) throw new Error(json.message || 'Could not update banner status.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update banner status.')
    }
  }

  const filtered = useMemo(() => banners.filter((banner) => {
    const cityLabel = banner.city?.name || banner.countryCode || 'Global'
    return (!search || `${cityLabel} ${banner.headline || ''} ${banner.category}`.toLowerCase().includes(search.toLowerCase()))
      && (!cityFilter || banner.cityId === cityFilter)
      && (!categoryFilter || banner.category === categoryFilter)
      && (!statusFilter || String(banner.isActive) === statusFilter)
  }), [banners, search, cityFilter, categoryFilter, statusFilter])

  const cityOptions = useMemo(() => Array.from(new Map(
    banners.filter((banner) => banner.city).map((banner) => [banner.city!.id, banner.city!])
  ).values()).sort((a, b) => a.name.localeCompare(b.name)), [banners])
  const previewImage = preview?.mobile ? preview.banner.mobileImageUrl || preview.banner.desktopImageUrl : preview?.banner.desktopImageUrl

  return <div className="space-y-5 text-white">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-bold">Hero Banners</h1><p className="mt-1 text-sm text-white/55">Manage city, country, and global search banners.</p></div>
      <button type="button" onClick={() => router.push('/admin/hero-banners/new')} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent-yellow px-4 text-sm font-semibold text-dark-blue"><Plus size={16} /> New banner</button>
    </header>

    <section className="flex flex-col gap-3 border-y border-white/10 py-3 lg:flex-row">
      <label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search city or headline" className="h-10 w-full rounded-md border border-white/10 bg-[#0b1220] pl-9 pr-3 text-sm outline-none focus:border-accent-yellow/50" /></label>
      <GlobalDropdown value={cityFilter} onChange={(value) => setCityFilter(String(value))} options={[{ value: '', label: 'All cities' }, ...cityOptions.map((city) => ({ value: city.id, label: city.name }))]} placeholder="All cities" searchable appearance="admin-dark" dense showLabel={false} className="min-w-40" />
      <GlobalDropdown value={categoryFilter} onChange={(value) => setCategoryFilter(String(value))} options={[{ value: '', label: 'All categories' }, ...Object.entries(CATEGORY_LABEL).map(([value, label]) => ({ value, label }))]} placeholder="All categories" appearance="admin-dark" dense showLabel={false} className="min-w-40" />
      <GlobalDropdown value={statusFilter} onChange={(value) => setStatusFilter(String(value))} options={[{ value: '', label: 'All statuses' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} placeholder="All statuses" appearance="admin-dark" dense showLabel={false} className="min-w-40" />
    </section>

    {error ? <div role="alert" className="flex items-center justify-between rounded-md border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}<button type="button" onClick={() => void load()} className="font-semibold underline">Retry</button></div> : null}
    {loading ? <div className="border-y border-white/10 py-12 text-center text-sm text-white/45">Loading banners…</div> : <div className="overflow-x-auto border-b border-white/10">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="text-xs uppercase tracking-wide text-white/40"><tr><th className="py-3 pr-4 font-medium">Location</th><th className="py-3 pr-4 font-medium">Category</th><th className="py-3 pr-4 font-medium">Assets</th><th className="py-3 pr-4 font-medium">Headline</th><th className="py-3 pr-4 font-medium">Status</th><th className="py-3 pr-4 font-medium">Updated</th><th className="py-3 font-medium">Actions</th></tr></thead>
        <tbody>{filtered.map((banner) => <tr key={banner.id} className="border-t border-white/[0.07]">
          <td className="py-3 pr-4"><div className="font-medium">{banner.city?.name || banner.countryCode || 'Global'}</div><div className="mt-0.5 text-xs text-white/40">{banner.scope}</div></td>
          <td className="py-3 pr-4">{CATEGORY_LABEL[banner.category]}</td>
          <td className="py-3 pr-4 text-xs text-white/55">D {banner.desktopWidth && banner.desktopHeight ? `${banner.desktopWidth}×${banner.desktopHeight}` : '—'}<br />M {banner.mobileWidth && banner.mobileHeight ? `${banner.mobileWidth}×${banner.mobileHeight}` : '—'}</td>
          <td className="max-w-[220px] truncate py-3 pr-4">{banner.headline || '—'}</td>
          <td className="py-3 pr-4"><span className={banner.isActive ? 'text-emerald-300' : 'text-white/40'}>{banner.isActive ? 'Active' : 'Inactive'}</span></td>
          <td className="py-3 pr-4 text-xs text-white/50">{formatDate(banner.updatedAt)}</td>
          <td className="py-3"><div className="flex items-center gap-1"><button type="button" title="Preview" onClick={() => setPreview({ banner, mobile: false })} className="rounded p-2 text-white/55 hover:bg-white/10 hover:text-white"><Eye size={16} /></button><button type="button" onClick={() => router.push(`/admin/hero-banners/${encodeURIComponent(banner.id)}/edit`)} className="rounded px-2 py-1.5 text-xs font-semibold text-white/75 hover:bg-white/10">Edit</button><button type="button" onClick={() => void toggleStatus(banner)} className="rounded px-2 py-1.5 text-xs font-semibold text-accent-yellow hover:bg-white/10">{banner.isActive ? 'Deactivate' : 'Activate'}</button></div></td>
        </tr>)}</tbody>
      </table>
      {!filtered.length ? <p className="py-12 text-center text-sm text-white/45">No banners match these filters.</p> : null}
    </div>}

    {preview ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"><section role="dialog" aria-modal="true" aria-label="Hero banner preview" className="w-full max-w-5xl rounded-lg border border-white/10 bg-[#101a2a] p-4"><header className="mb-3 flex items-center justify-between"><div><h2 className="font-semibold">{preview.banner.headline || 'Banner preview'}</h2><p className="text-xs text-white/45">{preview.mobile ? 'Mobile composition' : 'Desktop composition'}</p></div><div className="flex gap-2"><button type="button" onClick={() => setPreview({ ...preview, mobile: !preview.mobile })} className="rounded border border-white/10 px-3 py-1.5 text-xs">{preview.mobile ? 'Desktop' : 'Mobile'}</button><button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="rounded p-2 text-white/60 hover:bg-white/10"><X size={16} /></button></div></header><div className={`relative isolate mx-auto flex aspect-[4.27/1] items-center justify-center overflow-hidden rounded-md bg-[#18324b] p-4 text-center ${preview.mobile ? 'max-w-[430px] aspect-[1.875/1]' : ''}`}>{previewImage ? <img src={previewImage} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" /> : null}<div className="absolute inset-0 -z-10 bg-[#071827]/60" /><div className="max-w-3xl"><h3 className="text-xl font-bold sm:text-4xl">{preview.banner.headline || 'Discover premium properties'}</h3><p className="mt-2 text-xs text-white/80 sm:text-base">{preview.banner.subheadline}</p></div></div></section></div> : null}
  </div>
}
