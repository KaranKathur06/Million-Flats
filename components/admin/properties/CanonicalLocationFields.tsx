'use client'

import { useEffect, useState } from 'react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'

type Option = { id: string; name: string; iso2?: string }

export function CanonicalLocationFields({ country, state, city, community, onChange }: { country: string; state?: string; city: string; community: string; onChange: (next: { country: string; state: string; city: string; community: string }) => void }) {
  const [countries, setCountries] = useState<Option[]>([]); const [states, setStates] = useState<Option[]>([]); const [cities, setCities] = useState<Option[]>([]); const [communities, setCommunities] = useState<Option[]>([])
  useEffect(() => { fetch('/api/admin/locations').then(r => r.json()).then(d => setCountries(d.countries || []) ).catch(() => setCountries([])) }, [])
  useEffect(() => { if (!country) { setStates([]); setCities([]); return }; fetch(`/api/admin/locations?country=${encodeURIComponent(country)}`).then(r => r.json()).then(d => { setStates(d.states || []); setCities(d.cities || []) }).catch(() => { setStates([]); setCities([]) }) }, [country])
  useEffect(() => { if (!country || !city) return setCommunities([]); fetch(`/api/admin/locations?country=${encodeURIComponent(country)}&city=${encodeURIComponent(city)}`).then(r => r.json()).then(d => setCommunities(d.communities || []) ).catch(() => setCommunities([])) }, [country, city])
  const options = (items: Option[]) => items.map(item => ({ value: item.iso2 || item.name, label: item.name }))
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-4"><GlobalDropdown label="Country" value={country} onChange={v => onChange({ country: String(v), state: '', city: '', community: '' })} options={options(countries)} searchable appearance="admin-dark" /><GlobalDropdown label="State / Emirate" value={state || ''} onChange={v => onChange({ country, state: String(v), city: '', community: '' })} options={[{ value: '', label: states.length ? 'Select State / Emirate' : 'No states available' }, ...options(states)]} searchable disabled={!country} appearance="admin-dark" /><GlobalDropdown label="City" value={city} onChange={v => onChange({ country, state: state || '', city: String(v), community: '' })} options={options(cities.filter((item: any) => !state || item.stateId === state || item.state?.name === state))} searchable disabled={!state} appearance="admin-dark" /><GlobalDropdown label="Community / locality" value={community} onChange={v => onChange({ country, state: state || '', city, community: String(v) })} options={options(communities)} searchable disabled={!city} appearance="admin-dark" /></div>
}
