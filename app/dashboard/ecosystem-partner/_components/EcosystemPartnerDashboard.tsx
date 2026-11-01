'use client'

import { useCallback, useEffect, useState } from 'react'

type Membership = {
  id: string
  partnerId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  partner: { name: string; category: { title: string } }
}

type DashboardData = {
  partner: {
    id: string
    name: string
    tagline: string | null
    shortDescription: string | null
    description: string | null
    locationCoverage: string | null
    category: { title: string }
    services: Array<{ id: string; name: string; description: string | null }>
    locations: Array<{ id: string; city: string; region: string | null; isPrimary: boolean }>
  }
  role: Membership['role']
  leads: Array<{
    id: string
    name: string
    email: string
    phone: string | null
    message: string | null
    status: string
    createdAt: string
    budgetRange: string | null
    propertyType: string | null
  }>
  total: number
  statusCounts: Array<{ status: string; count: number }>
}

export default function EcosystemPartnerDashboard({
  memberships,
  initialPartnerId,
}: {
  memberships: Membership[]
  initialPartnerId: string
}) {
  const [partnerId, setPartnerId] = useState(initialPartnerId)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(Boolean(initialPartnerId))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [profile, setProfile] = useState({ tagline: '', shortDescription: '', description: '', locationCoverage: '' })
  const [inviteEmail, setInviteEmail] = useState('')
  const [members, setMembers] = useState<Array<{ id: string; inviteEmail: string; role: string; status: string; user: { id: string; name: string | null } | null }>>([])
  const [servicesText, setServicesText] = useState('')
  const [locationsText, setLocationsText] = useState('')
  const [sensitive, setSensitive] = useState({ name: '', contactEmail: '', contactPhone: '', website: '', pricingRange: '' })
  const [uploadingMedia, setUploadingMedia] = useState('')

  const load = useCallback(async () => {
    if (!partnerId) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/dashboard`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load partner dashboard.')
      setData(payload.data)
      setProfile({
        tagline: payload.data.partner.tagline || '',
        shortDescription: payload.data.partner.shortDescription || '',
        description: payload.data.partner.description || '',
        locationCoverage: payload.data.partner.locationCoverage || '',
      })
      setServicesText((payload.data.partner.services || []).map((service: { name: string; description: string | null }) => `${service.name}${service.description ? ` | ${service.description}` : ''}`).join('\n'))
      setLocationsText((payload.data.partner.locations || []).map((location: { city: string; region: string | null; isPrimary: boolean }) => `${location.city}${location.region ? ` | ${location.region}` : ''}${location.isPrimary ? ' | primary' : ''}`).join('\n'))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load partner dashboard.')
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => { void load() }, [load])

  const canManageMemberships = memberships.some((membership) => membership.partnerId === partnerId && membership.role !== 'MEMBER')
  useEffect(() => {
    if (!partnerId || !canManageMemberships) {
      setMembers([])
      return
    }
    let active = true
    fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/members`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load members.')
        if (active) setMembers(payload.data)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load members.')
      })
    return () => { active = false }
  }, [partnerId, canManageMemberships])

  const updateProfile = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to update profile.')
      setNotice('Public profile updated.')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update profile.')
    }
  }

  const inviteMember = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: 'MEMBER' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to invite member.')
      setNotice(payload.deliveryStatus === 'sent' ? 'Invitation email sent.' : 'Invitation created, but email delivery is pending. Resend it to generate a fresh invitation.')
      setInviteEmail('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to invite member.')
    }
  }

  const updateLead = async (leadId: string, status: 'CONTACTED' | 'WON' | 'LOST') => {
    setError('')
    try {
      const response = await fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to update lead.')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update lead.')
    }
  }

  const stageSensitiveChange = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const changes = Object.fromEntries(Object.entries(sensitive).filter(([, value]) => value.trim()))
    if (!Object.keys(changes).length) {
      setError('Enter at least one sensitive profile update.')
      return
    }
    try {
      const response = await fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/profile-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to submit profile changes.')
      setNotice('Sensitive profile changes were submitted for administrator review.')
      setSensitive({ name: '', contactEmail: '', contactPhone: '', website: '', pricingRange: '' })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit profile changes.')
    }
  }

  const uploadMedia = async (type: 'LOGO' | 'COVER', file?: File) => {
    if (!file) return
    setUploadingMedia(type)
    setError('')
    setNotice('')
    try {
      const formData = new FormData()
      formData.set('type', type)
      formData.set('file', file)
      const response = await fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/media`, { method: 'POST', body: formData })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to upload image.')
      setNotice(`${type === 'LOGO' ? 'Logo' : 'Cover image'} submitted for administrator review.`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to upload image.')
    } finally {
      setUploadingMedia('')
    }
  }

  const saveOfferings = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    const services = servicesText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [name, ...description] = line.split('|')
      return { name: name.trim(), description: description.join('|').trim() || null }
    })
    const locations = locationsText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
      const [city, region = '', primary = ''] = line.split('|').map((part) => part.trim())
      return { city, region: region || null, isPrimary: primary.toLowerCase() === 'primary' }
    })
    try {
      const response = await fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/offerings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services, locations }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to save services.')
      setNotice('Services and service locations updated.')
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save services.')
    }
  }

  const updateMember = async (membershipId: string, role?: 'ADMIN' | 'MEMBER') => {
    try {
      const response = await fetch(`/api/ecosystem-partners/${encodeURIComponent(partnerId)}/members/${encodeURIComponent(membershipId)}`, {
        method: role ? 'PATCH' : 'DELETE',
        headers: role ? { 'Content-Type': 'application/json' } : undefined,
        body: role ? JSON.stringify({ role }) : undefined,
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to update member.')
      setMembers((current) => current.map((member) => member.id === membershipId
        ? role ? { ...member, role } : { ...member, status: 'REVOKED' }
        : member))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update member.')
    }
  }

  const activeMembership = memberships.find((membership) => membership.partnerId === partnerId)
  const canManage = activeMembership?.role === 'OWNER' || activeMembership?.role === 'ADMIN'

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 rounded-3xl bg-slate-950 p-7 text-white sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Partner workspace</p>
            <h1 className="mt-2 text-3xl font-bold">{data?.partner.name || 'Ecosystem Partner Dashboard'}</h1>
            <p className="mt-2 text-sm text-white/65">{data?.partner.category.title || 'Manage your MillionFlats partner presence and leads.'}</p>
          </div>
          {memberships.length > 1 ? (
            <label className="text-sm text-white/80">
              Partner
              <select value={partnerId} onChange={(event) => setPartnerId(event.target.value)} className="mt-1 block min-w-64 rounded-xl border border-white/15 bg-slate-900 px-3 py-2 text-white">
                {memberships.map((membership) => <option key={membership.partnerId} value={membership.partnerId}>{membership.partner.name}</option>)}
              </select>
            </label>
          ) : null}
        </header>

        {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
        {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div> : null}
        {!memberships.length ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <h2 className="text-xl font-semibold">No active partner workspace</h2>
            <p className="mt-2 text-sm text-slate-600">Your MillionFlats account does not currently have an active membership for an approved ecosystem partner.</p>
          </section>
        ) : loading ? <p className="text-sm text-slate-600">Loading partner data…</p> : null}

        {data ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric title="Visible leads" value={data.total} />
              {data.statusCounts.slice(0, 3).map((item) => <Metric key={item.status} title={item.status} value={item.count} />)}
            </section>

            {canManage ? (
              <section className="grid gap-6 lg:grid-cols-2">
                <form onSubmit={updateProfile} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <div>
                    <h2 className="text-xl font-semibold">Public profile</h2>
                    <p className="mt-1 text-sm text-slate-500">Low-risk edits publish immediately. Legal, contact, pricing and media changes require admin review.</p>
                  </div>
                  <Field label="Tagline" value={profile.tagline} onChange={(value) => setProfile({ ...profile, tagline: value })} />
                  <Field label="Short description" value={profile.shortDescription} onChange={(value) => setProfile({ ...profile, shortDescription: value })} />
                  <Field label="Service coverage" value={profile.locationCoverage} onChange={(value) => setProfile({ ...profile, locationCoverage: value })} />
                  <label className="block text-sm font-medium">About<textarea rows={5} value={profile.description} onChange={(event) => setProfile({ ...profile, description: event.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <button className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Save public profile</button>
                </form>

                <form onSubmit={inviteMember} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <div>
                    <h2 className="text-xl font-semibold">Invite a teammate</h2>
                    <p className="mt-1 text-sm text-slate-500">Members can view and update only leads assigned to them.</p>
                  </div>
                  <label className="block text-sm font-medium">MillionFlats account email<input required type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <button className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold">Send invitation</button>
                </form>

                <form onSubmit={saveOfferings} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <div><h2 className="text-xl font-semibold">Services and coverage</h2><p className="mt-1 text-sm text-slate-500">One service per line; use “Service | description”. Locations use “City | region | primary”.</p></div>
                  <label className="block text-sm font-medium">Services<textarea rows={5} value={servicesText} onChange={(event) => setServicesText(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <label className="block text-sm font-medium">Locations<textarea rows={4} value={locationsText} onChange={(event) => setLocationsText(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
                  <button className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white">Save services</button>
                </form>

                <form onSubmit={stageSensitiveChange} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <div><h2 className="text-xl font-semibold">Business details for review</h2><p className="mt-1 text-sm text-slate-500">Legal name, contact information, website and pricing publish only after administrator approval.</p></div>
                  <Field label="Business name" value={sensitive.name} onChange={(value) => setSensitive({ ...sensitive, name: value })} />
                  <Field label="Business email" value={sensitive.contactEmail} onChange={(value) => setSensitive({ ...sensitive, contactEmail: value })} />
                  <Field label="Business phone" value={sensitive.contactPhone} onChange={(value) => setSensitive({ ...sensitive, contactPhone: value })} />
                  <Field label="Website URL" value={sensitive.website} onChange={(value) => setSensitive({ ...sensitive, website: value })} />
                  <Field label="Pricing range" value={sensitive.pricingRange} onChange={(value) => setSensitive({ ...sensitive, pricingRange: value })} />
                  <button className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold">Submit for review</button>
                </form>

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <div><h2 className="text-xl font-semibold">Brand media</h2><p className="mt-1 text-sm text-slate-500">Images are optimized and published only after administrator review.</p></div>
                  <label className="block text-sm font-medium">Logo (JPEG, PNG or WebP; up to 2 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingMedia)} onChange={(event) => void uploadMedia('LOGO', event.target.files?.[0])} className="mt-2 block w-full text-sm" /></label>
                  <label className="block text-sm font-medium">Cover image (JPEG, PNG or WebP; up to 10 MB)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(uploadingMedia)} onChange={(event) => void uploadMedia('COVER', event.target.files?.[0])} className="mt-2 block w-full text-sm" /></label>
                  {uploadingMedia ? <p className="text-sm text-slate-500">Uploading {uploadingMedia.toLowerCase()}…</p> : null}
                </section>

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
                  <div><h2 className="text-xl font-semibold">Partner members</h2><p className="mt-1 text-sm text-slate-500">Invitations expire after seven days. Owners are managed by platform administrators.</p></div>
                  {members.map((member) => (
                    <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <div><p className="text-sm font-semibold">{member.user?.name || member.inviteEmail}</p><p className="text-xs text-slate-500">{member.inviteEmail} · {member.role} · {member.status}</p></div>
                      {member.status !== 'REVOKED' && member.role !== 'OWNER' ? <div className="flex gap-2">
                        <button type="button" onClick={() => updateMember(member.id, member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold">{member.role === 'ADMIN' ? 'Make member' : 'Make admin'}</button>
                        <button type="button" onClick={() => updateMember(member.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700">Revoke</button>
                      </div> : null}
                    </div>
                  ))}
                  {!members.length ? <p className="text-sm text-slate-500">No partner members yet.</p> : null}
                </section>
              </section>
            ) : null}

            <section className="rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-6">
                <h2 className="text-xl font-semibold">Partner inquiries</h2>
                <p className="mt-1 text-sm text-slate-500">Showing the most recent 50 inquiries in your authorized scope.</p>
              </div>
              {!data.leads.length ? <p className="p-6 text-sm text-slate-500">No inquiries are available in your assigned lead scope.</p> : (
                <div className="divide-y divide-slate-100">
                  {data.leads.map((lead) => (
                    <article key={lead.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{lead.name}</h3>
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{lead.status}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">{lead.email}{lead.phone ? ` · ${lead.phone}` : ''}</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{lead.message || 'No message provided.'}</p>
                        <p className="mt-2 text-xs text-slate-500">{new Date(lead.createdAt).toLocaleString()}{lead.propertyType ? ` · ${lead.propertyType}` : ''}{lead.budgetRange ? ` · ${lead.budgetRange}` : ''}</p>
                      </div>
                      <div className="flex flex-wrap items-start gap-2">
                        <button onClick={() => updateLead(lead.id, 'CONTACTED')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold">Mark contacted</button>
                        <button onClick={() => updateLead(lead.id, 'WON')} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800">Won</button>
                        <button onClick={() => updateLead(lead.id, 'LOST')} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">Lost</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </main>
  )
}

function Metric({ title, value }: { title: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{title.replaceAll('_', ' ')}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
}
