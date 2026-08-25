'use client'

import { useEffect, useMemo, useState } from 'react'

type AmenityRecord = { id: string; name: string; category: string }

const CATEGORY_ALIASES: Record<string, string> = {
  interior: 'Interior', home: 'Interior', building: 'Building', security: 'Building', outdoor: 'Outdoor', exterior: 'Outdoor', parking: 'Parking', land: 'Outdoor', commercial: 'Building',
}

function displayCategory(value: string) {
  const normalized = value.trim().toLowerCase()
  return CATEGORY_ALIASES[normalized] || value.trim() || 'Other'
}

function supportsPropertyType(category: string, propertyType: string, propertyCategory?: string | null) {
  const type = propertyType.toLowerCase()
  const group = category.toLowerCase()
  if (propertyCategory === 'LAND' || ['plot', 'land'].some((value) => type.includes(value))) return group === 'outdoor' || group === 'other'
  if (type.includes('commercial') || type.includes('office') || type.includes('retail') || type.includes('warehouse')) return !['outdoor'].includes(group)
  return true
}

export default function ManualPropertyAmenities({
  selected,
  customSelected,
  propertyType,
  propertyCategory,
  onSelectedChange,
  onCustomChange,
}: {
  selected: string[]
  customSelected: string[]
  propertyType?: string | null
  propertyCategory?: string | null
  onSelectedChange: (values: string[]) => void
  onCustomChange: (values: string[]) => void
}) {
  const [records, setRecords] = useState<AmenityRecord[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [search, setSearch] = useState('')
  const [customInput, setCustomInput] = useState('')

  async function load() {
    setStatus('loading')
    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 15000)
      const response = await fetch('/api/amenities-index', { cache: 'no-store', signal: controller.signal })
      window.clearTimeout(timeout)
      const payload = await response.json()
      if (!response.ok || !Array.isArray(payload?.records)) throw new Error('Unable to load amenities')
      setRecords(payload.records.filter((item: AmenityRecord) => item?.name && item?.category))
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  useEffect(() => { void load() }, [])

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const grouped = new Map<string, AmenityRecord[]>()
    records.filter((record) => supportsPropertyType(displayCategory(record.category), String(propertyType || ''), propertyCategory)).forEach((record) => {
      if (query && !record.name.toLowerCase().includes(query)) return
      const category = displayCategory(record.category)
      const values = grouped.get(category) || []
      values.push(record)
      grouped.set(category, values)
    })
    return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [propertyCategory, propertyType, records, search])

  function toggle(name: string) {
    const current = new Set(selected)
    if (current.has(name)) current.delete(name)
    else current.add(name)
    onSelectedChange(Array.from(current))
  }

  function addCustom() {
    const value = customInput.trim().replace(/\s+/g, ' ')
    if (!value || customSelected.length >= 5 || customSelected.some((item) => item.toLowerCase() === value.toLowerCase())) return
    onCustomChange([...customSelected, value])
    setCustomInput('')
  }

  return <div className="space-y-6">
    <section className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-dark-blue">Amenities</h2><p className="mt-1 text-sm text-gray-600">Choose from the current MillionFlats catalogue.</p></div><span className="text-sm font-semibold text-dark-blue">{selected.length + customSelected.length} selected</span></div>
      <label className="mt-5 block"><span className="sr-only">Search amenities</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search amenities..." className="h-11 w-full rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-dark-blue" /></label>
      {status === 'loading' ? <p className="mt-5 text-sm text-gray-600">Loading amenities...</p> : null}
      {status === 'error' ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>Unable to load amenities.</p><button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">Retry</button><p className="mt-1 text-xs">If the problem continues, please contact support.</p></div> : null}
      {status === 'success' && records.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-5 text-sm text-gray-600"><p>No amenities are currently available.</p><p className="mt-1 text-xs">Contact an administrator to configure the amenity catalogue.</p></div> : null}
      {status === 'success' && records.length > 0 && groups.length === 0 ? <p className="mt-5 text-sm text-gray-600">No amenities match your search.</p> : null}
      <div className="mt-5 space-y-6">{groups.map(([category, values]) => <div key={category}><div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-2"><h3 className="text-sm font-semibold text-dark-blue">{category}</h3><span className="text-xs text-gray-500">{values.filter((item) => selected.includes(item.name)).length} selected</span></div><div className="grid gap-2 sm:grid-cols-2">{values.map((item) => { const isSelected = selected.includes(item.name); return <button key={item.id} type="button" aria-pressed={isSelected} onClick={() => toggle(item.name)} className={`min-h-11 rounded-xl border px-3 text-left text-sm transition ${isSelected ? 'border-dark-blue bg-dark-blue text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-dark-blue/40'}`}><span className="mr-2 inline-block w-4">{isSelected ? '✓' : '□'}</span>{item.name}</button> })}</div></div>)}</div>
    </section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5"><h3 className="font-semibold text-dark-blue">Selected amenities</h3><div className="mt-3 flex flex-wrap gap-2">{[...selected, ...customSelected].map((item) => <button key={item} type="button" onClick={() => selected.includes(item) ? onSelectedChange(selected.filter((value) => value !== item)) : onCustomChange(customSelected.filter((value) => value !== item))} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700">{item} ×</button>)}{selected.length + customSelected.length === 0 ? <span className="text-sm text-gray-500">No amenities selected yet.</span> : null}</div></section>
    <section className="rounded-2xl border border-gray-200 bg-white p-5"><div className="flex items-end justify-between gap-3"><div><h3 className="font-semibold text-dark-blue">Custom amenities</h3><p className="mt-1 text-xs text-gray-600">Add something not in the catalogue. Maximum 5, subject to admin review.</p></div><span className="text-xs text-gray-500">{customSelected.length}/5</span></div><div className="mt-4 flex gap-2"><input value={customInput} onChange={(event) => setCustomInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom() } }} placeholder="Private elevator" className="h-11 min-w-0 flex-1 rounded-xl border border-gray-300 px-4 text-sm" /><button type="button" onClick={addCustom} disabled={customSelected.length >= 5} className="h-11 rounded-xl bg-dark-blue px-4 text-sm font-semibold text-white disabled:opacity-40">Add</button></div></section>
  </div>
}
