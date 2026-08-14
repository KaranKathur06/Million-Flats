'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { CitySelector, CountrySelector } from '@/components/location/CountryCitySelector'
import { getCommunityOptions, normalizeLocationPair } from '@/lib/propertyCanonical'

const PROPERTY_TYPES = ['Apartment', 'Villa', 'Plot', 'Penthouse', 'Townhouse', 'Duplex', 'Studio', 'Commercial', 'Retail']
const AMENITY_OPTIONS = [
    'Swimming Pool', 'Gym', 'Clubhouse', 'Garden', 'Parking', 'Security', 'Power Backup',
    'Lift', 'Kids Play Area', 'Sports Facility', 'Jogging Track', 'Community Hall',
    'Library', 'Spa', 'Yoga Room', 'Indoor Games', 'Amphitheatre', 'Cycling Track',
    'Pet Friendly', 'EV Charging', 'Co-working Space', 'Rainwater Harvesting', 'Solar Panels',
    'Vastu Compliant', 'Fire Safety', 'CCTV', 'Intercom', 'Piped Gas',
]

export default function AdminAddPropertyPage() {
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        title: '',
        propertyType: 'Apartment',
        intent: 'SALE',
        price: '',
        currency: 'INR',
        constructionStatus: '',
        shortDescription: '',
        bedrooms: '0',
        bathrooms: '0',
        squareFeet: '0',
        countryCode: 'INDIA',
        countryIso2: 'IN',
        city: '',
        community: '',
        address: '',
        latitude: '',
        longitude: '',
        developerName: '',
        amenities: [] as string[],
        customAmenity: '',
        paymentPlanText: '',
        emiNote: '',
        tour3dUrl: '',
        status: 'APPROVED',
    })

    const communityOptions = useMemo(() => getCommunityOptions(form.countryIso2 || 'IN', form.city || 'Navi Mumbai'), [form.city, form.countryIso2])

    const update = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }))

    const toggleAmenity = (a: string) => {
        setForm(prev => ({
            ...prev,
            amenities: prev.amenities.includes(a) ? prev.amenities.filter(x => x !== a) : [...prev.amenities, a],
        }))
    }

    const addCustomAmenity = () => {
        const val = form.customAmenity.trim()
        if (!val || form.amenities.includes(val)) return
        setForm(prev => ({ ...prev, amenities: [...prev.amenities, val], customAmenity: '' }))
    }

    const handleSubmit = useCallback(async (asDraft: boolean) => {
        if (!form.title.trim()) { toast.error('Title is required'); return }

        setSaving(true)
        try {
            const canonical = normalizeLocationPair(form.countryCode || form.countryIso2, form.city, form.community)

            const body: any = {
                title: form.title.trim(),
                propertyType: form.propertyType,
                intent: form.intent,
                price: form.price ? parseFloat(form.price) : null,
                currency: form.currency,
                constructionStatus: form.constructionStatus || null,
                shortDescription: form.shortDescription.trim() || null,
                bedrooms: parseInt(form.bedrooms) || 0,
                bathrooms: parseInt(form.bathrooms) || 0,
                squareFeet: parseFloat(form.squareFeet) || 0,
                countryCode: canonical.country === 'India' ? 'INDIA' : 'UAE',
                countryIso2: canonical.countryCode,
                city: canonical.city,
                community: canonical.community,
                address: form.address.trim() || null,
                latitude: form.latitude ? parseFloat(form.latitude) : null,
                longitude: form.longitude ? parseFloat(form.longitude) : null,
                developerName: form.developerName.trim() || null,
                amenities: form.amenities.length > 0 ? form.amenities : null,
                paymentPlanText: form.paymentPlanText.trim() || null,
                emiNote: form.emiNote.trim() || null,
                tour3dUrl: form.tour3dUrl.trim() || null,
                status: asDraft ? 'DRAFT' : 'APPROVED',
            }

            const res = await fetch('/api/admin/properties', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const json = await res.json()
            if (!json.success) throw new Error(json.message || 'Failed to create property')
            toast.success(asDraft ? 'Property saved as draft' : 'Property created & approved')

            // Reset form
            setForm({
                title: '', propertyType: 'Apartment', intent: 'SALE', price: '', currency: 'INR',
                constructionStatus: '', shortDescription: '', bedrooms: '0', bathrooms: '0',
                squareFeet: '0', countryCode: 'INDIA', countryIso2: 'IN', city: '', community: '',
                address: '', latitude: '', longitude: '', developerName: '', amenities: [],
                customAmenity: '', paymentPlanText: '', emiNote: '', tour3dUrl: '', status: 'APPROVED',
            })
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }, [form])

    const inputClass = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-amber-400/30 focus:ring-1 focus:ring-amber-400/10 transition-all'
    const labelClass = 'block text-sm font-medium text-white/60 mb-1.5'
    const sectionClass = 'rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4'

    return (
        <div>
            <Toaster position="top-right" toastOptions={{ style: { background: '#0a1628', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' } }} />

            {/* Header */}
            <div className="flex items-center gap-3 mb-1">
                <Link href="/admin/properties" className="inline-flex items-center gap-1 text-white/40 hover:text-white/70 transition-colors text-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Properties
                </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white/95 mb-1">Add Property</h1>
            <p className="text-sm text-white/40 mb-8">Create a new property listing</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className={sectionClass}>
                        <h2 className="text-sm font-semibold text-white/80">Basic Information</h2>
                        <div>
                            <label className={labelClass}>Title *</label>
                            <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Lodha Alibaug 3 BHK Apartment" className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <CountrySelector
                                    value={form.countryIso2 || 'IN'}
                                    onChange={({ code }) => {
                                        const nextCountryCode = code === 'AE' ? 'UAE' : 'INDIA'
                                        update('countryIso2', code)
                                        update('countryCode', nextCountryCode)
                                        update('city', '')
                                        update('community', '')
                                    }}
                                    appearance="admin-dark"
                                />
                            </div>
                            <div>
                                <CitySelector
                                    countryCode={form.countryIso2 || 'IN'}
                                    value={form.city}
                                    onChange={({ name }) => {
                                        update('city', name)
                                        update('community', '')
                                    }}
                                    placeholder="Search city"
                                    appearance="admin-dark"
                                />
                            </div>
                        </div>
                        {form.city && communityOptions.length > 0 ? (
                            <div>
                                <label className={labelClass}>Community / Area</label>
                                <GlobalDropdown
                                  value={form.community}
                                  onChange={(v) => update('community', String(v || ''))}
                                  options={communityOptions.map((community) => ({ value: community.value, label: community.label }))}
                                  showLabel={false}
                                  appearance="admin-dark"
                                  className={inputClass}
                                />
                            </div>
                        ) : null}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Property Type</label>
                                <GlobalDropdown
                                  value={form.propertyType}
                                  onChange={(v) => update('propertyType', v as string)}
                                  options={PROPERTY_TYPES.map(t => ({ value: t, label: t }))}
                                  showLabel={false}
                                  appearance="admin-dark"
                                  className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Intent</label>
                                <GlobalDropdown
                                  value={form.intent}
                                  onChange={(v) => update('intent', v as string)}
                                  options={[{ value: 'SALE', label: 'Sale' }, { value: 'RENT', label: 'Rent' }]}
                                  showLabel={false}
                                  appearance="admin-dark"
                                  className={inputClass}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Price</label>
                                <input type="number" value={form.price} onChange={e => update('price', e.target.value)} placeholder="15000000" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Currency</label>
                                <GlobalDropdown
                                  value={form.currency}
                                  onChange={(v) => update('currency', v as string)}
                                  options={[{ value: 'INR', label: 'INR (₹)' }, { value: 'AED', label: 'AED' }, { value: 'USD', label: 'USD ($)' }]}
                                  showLabel={false}
                                  appearance="admin-dark"
                                  className={inputClass}
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Construction Status</label>
                            <GlobalDropdown
                              value={form.constructionStatus}
                              onChange={(v) => update('constructionStatus', v as string)}
                              options={[{ value: '', label: 'Not specified' }, { value: 'READY', label: 'Ready to Move' }, { value: 'OFF_PLAN', label: 'Under Construction / Off Plan' }]}
                              showLabel={false}
                              appearance="admin-dark"
                              className={inputClass}
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div className={sectionClass}>
                        <h2 className="text-sm font-semibold text-white/80">Location</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Country</label>
                                <GlobalDropdown
                                  value={form.countryCode}
                                  onChange={(v) => { 
                                    const countryValue = v as string
                                    update('countryCode', countryValue)
                                    update('countryIso2', countryValue === 'INDIA' ? 'IN' : 'AE')
                                    update('currency', countryValue === 'INDIA' ? 'INR' : 'AED')
                                  }}
                                  options={[{ value: 'INDIA', label: 'India' }, { value: 'UAE', label: 'UAE' }]}
                                  showLabel={false}
                                  appearance="admin-dark"
                                  className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>City</label>
                                <input value={form.city} onChange={e => update('city', e.target.value)} placeholder="Navi Mumbai" className={inputClass} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Community / Locality</label>
                                <input value={form.community} onChange={e => update('community', e.target.value)} placeholder="Kharghar" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Developer</label>
                                <input value={form.developerName} onChange={e => update('developerName', e.target.value)} placeholder="Lodha Group" className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Address</label>
                            <input value={form.address} onChange={e => update('address', e.target.value)} placeholder="Full address" className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Latitude</label>
                                <input type="number" step="any" value={form.latitude} onChange={e => update('latitude', e.target.value)} placeholder="19.0760" className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Longitude</label>
                                <input type="number" step="any" value={form.longitude} onChange={e => update('longitude', e.target.value)} placeholder="72.8777" className={inputClass} />
                            </div>
                        </div>
                    </div>

                    {/* Details */}
                    <div className={sectionClass}>
                        <h2 className="text-sm font-semibold text-white/80">Property Details</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={labelClass}>Bedrooms</label>
                                <input type="number" min="0" value={form.bedrooms} onChange={e => update('bedrooms', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Bathrooms</label>
                                <input type="number" min="0" value={form.bathrooms} onChange={e => update('bathrooms', e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Area (sq ft)</label>
                                <input type="number" min="0" value={form.squareFeet} onChange={e => update('squareFeet', e.target.value)} className={inputClass} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Description</label>
                            <textarea value={form.shortDescription} onChange={e => update('shortDescription', e.target.value)} rows={4} placeholder="Property description..." className={inputClass + ' resize-none'} />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Amenities */}
                    <div className={sectionClass}>
                        <h2 className="text-sm font-semibold text-white/80">Amenities</h2>
                        <div className="flex flex-wrap gap-2">
                            {AMENITY_OPTIONS.map(a => (
                                <button
                                    key={a}
                                    type="button"
                                    onClick={() => toggleAmenity(a)}
                                    className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all cursor-pointer ${form.amenities.includes(a)
                                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                                        : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/60 hover:bg-white/[0.06]'}`}
                                >
                                    {a}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={form.customAmenity} onChange={e => update('customAmenity', e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomAmenity()} placeholder="Add custom amenity" className={inputClass + ' flex-1'} />
                            <button type="button" onClick={addCustomAmenity} className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-white/50 hover:bg-white/[0.08] cursor-pointer">Add</button>
                        </div>
                        {form.amenities.filter(a => !AMENITY_OPTIONS.includes(a)).length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {form.amenities.filter(a => !AMENITY_OPTIONS.includes(a)).map(a => (
                                    <span key={a} className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-1 text-[11px] text-amber-300">
                                        {a}
                                        <button onClick={() => toggleAmenity(a)} className="text-amber-300/50 hover:text-amber-300 cursor-pointer">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Media */}
                    <div className={sectionClass}>
                        <h2 className="text-sm font-semibold text-white/80">Media</h2>
                        <p className="text-xs text-white/40">
                            Property images and brochures are uploaded from the property gallery workflow after creation, not via URL arrays here.
                        </p>
                    </div>

                    {/* Additional */}
                    <div className={sectionClass}>
                        <h2 className="text-sm font-semibold text-white/80">Additional Info</h2>
                        <div>
                            <label className={labelClass}>Payment Plan</label>
                            <textarea value={form.paymentPlanText} onChange={e => update('paymentPlanText', e.target.value)} rows={2} placeholder="e.g. 10% booking, 30% construction linked..." className={inputClass + ' resize-none'} />
                        </div>
                        <div>
                            <label className={labelClass}>EMI Note</label>
                            <input value={form.emiNote} onChange={e => update('emiNote', e.target.value)} placeholder="e.g. EMI starts from ₹25,000/month" className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>3D Tour URL</label>
                            <input value={form.tour3dUrl} onChange={e => update('tour3dUrl', e.target.value)} placeholder="https://..." className={inputClass} />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleSubmit(true)} disabled={saving} className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/60 hover:bg-white/[0.08] disabled:opacity-50 cursor-pointer transition-all">
                            {saving ? 'Saving...' : 'Save as Draft'}
                        </button>
                        <button type="button" onClick={() => handleSubmit(false)} disabled={saving} className="flex-1 rounded-xl bg-amber-400/90 px-5 py-3 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-50 cursor-pointer transition-colors shadow-lg shadow-amber-400/20">
                            {saving ? 'Saving...' : 'Save & Approve'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
