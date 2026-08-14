'use client'

import { useEffect, useState } from 'react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'

type Option = { id: string; name: string; iso2?: string }

export function CanonicalLocationFields({ country, city, community, onChange }: { country: string; city: string; community: string; onChange: (next: { country: string; city: string; community: string }) => void }) {
  const [countries, setCountries] = useState<Option[]>([]); const [cities, setCities] = useState<Option[]>([]); const [communities, setCommunities] = useState<Option[]>([])
  useEffect(() => { fetch('/api/admin/locations').then(r => r.json()).then(d => setCountries(d.countries || []) ).catch(() => setCountries([])) }, [])
  useEffect(() => { if (!country) return setCities([]); fetch(`/api/admin/locations?country=${encodeURIComponent(country)}`).then(r => r.json()).then(d => setCities(d.cities || []) ).catch(() => setCities([])) }, [country])
  useEffect(() => { if (!country || !city) return setCommunities([]); fetch(`/api/admin/locations?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`).then(r => r.json()).then(d => setCommunities(d.communities || []) ).catch(() => setCommunities([])) }, [country, city])
  const options = (items: Option[]) => items.map(item => ({ value: item.iso2 || item.name, label: item.name }))
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><GlobalDropdown label="Country" value={country} onChange={v => onChange({ country: String(v), city: '', community: '' })} options={options(countries)} searchable appearance="admin-dark" /><GlobalDropdown label="City" value={city} onChange={v => onChange({ country, city: String(v), community: '' })} options={options(cities)} searchable disabled={!country} appearance="admin-dark" /><GlobalDropdown label="Community / locality" value={community} onChange={v => onChange({ country, city, community: String(v) })} options={options(communities)} searchable disabled={!city} appearance="admin-dark" /></div>
}
