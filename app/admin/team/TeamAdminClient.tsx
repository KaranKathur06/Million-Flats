'use client'

import { useState, useCallback } from 'react'
import toast, { Toaster } from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string
  displayName: string
  designation: string | null
  bio: string | null
  imageUrl: string | null
  linkedinUrl: string | null
  location: string | null
  displayOrder: number
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE'
  userId: string | null
  user?: { id: string; email: string; name: string | null } | null
}

interface AccessGrant {
  id: string
  userId: string
  isTeamAdmin: boolean
  isRevoked: boolean
  revokedAt: string | null
  createdAt: string
  user: { id: string; email: string; name: string | null; role: string }
  grantedBy: { id: string; email: string } | null
}

interface UserOption {
  id: string
  email: string
  name: string | null
  role: string
}

interface Props {
  initialMembers: TeamMember[]
  initialAccessGrants: AccessGrant[]
  users: UserOption[]
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
    INACTIVE: 'bg-slate-800/40 text-slate-500 border-slate-700/40',
    DRAFT: 'bg-amber-900/30 text-amber-400 border-amber-800/40',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.DRAFT}`}>
      {status}
    </span>
  )
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  open, title, message, confirmLabel, danger,
  onConfirm, onCancel,
}: {
  open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean
  onConfirm: () => void; onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#0f1623] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Member form modal ─────────────────────────────────────────────────────────

function MemberFormModal({
  member, onClose, onSaved,
}: {
  member?: TeamMember | null
  onClose: () => void
  onSaved: (saved: TeamMember) => void
}) {
  const isEdit = !!member

  const [form, setForm] = useState({
    displayName: member?.displayName ?? '',
    designation: member?.designation ?? '',
    bio: member?.bio ?? '',
    imageUrl: member?.imageUrl ?? '',
    linkedinUrl: member?.linkedinUrl ?? '',
    location: member?.location ?? '',
    displayOrder: member?.displayOrder ?? 0,
    status: member?.status ?? 'DRAFT' as 'DRAFT' | 'ACTIVE' | 'INACTIVE',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.displayName.trim()) e.displayName = 'Name is required'
    if (form.linkedinUrl && !/^https?:\/\//.test(form.linkedinUrl)) e.linkedinUrl = 'Must be a valid URL'
    if (form.imageUrl && !/^https?:\/\//.test(form.imageUrl)) e.imageUrl = 'Must be a valid URL'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)

    try {
      const url = isEdit
        ? `/api/admin/team/members/${member!.id}`
        : '/api/admin/team/members'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          designation: form.designation.trim() || null,
          bio: form.bio.trim() || null,
          imageUrl: form.imageUrl.trim() || null,
          linkedinUrl: form.linkedinUrl.trim() || null,
          location: form.location.trim() || null,
          displayOrder: Number(form.displayOrder),
          status: form.status,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || 'Save failed')
        setSaving(false)
        return
      }

      const data = await res.json()
      toast.success(isEdit ? 'Profile updated' : 'Profile created')
      onSaved(data.member)
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  const field = (key: keyof typeof form, label: string, props?: any) => (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor={`mf-${key}`}>{label}</label>
      {props?.textarea ? (
        <textarea
          id={`mf-${key}`}
          value={form[key] as string}
          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
          {...props}
        />
      ) : (
        <input
          id={`mf-${key}`}
          value={form[key] as string | number}
          onChange={e => setForm(f => ({ ...f, [key]: props?.type === 'number' ? Number(e.target.value) : e.target.value }))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
          {...props}
        />
      )}
      {errors[key] && <p className="text-xs text-red-400 mt-1">{errors[key]}</p>}
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1623] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-5">
          {isEdit ? 'Edit Profile' : 'New Team Member'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {field('displayName', 'Full Name *', { placeholder: 'e.g. Karan Kathur', required: true })}
          {field('designation', 'Designation', { placeholder: 'e.g. Head of Technology & AI' })}
          {field('location', 'Location', { placeholder: 'e.g. Dubai, India, London' })}
          {field('bio', 'Bio', { textarea: true, placeholder: 'Short biography...' })}
          {field('imageUrl', 'Profile Image URL', { placeholder: 'https://...' })}
          {field('linkedinUrl', 'LinkedIn URL', { placeholder: 'https://linkedin.com/in/...' })}
          {field('displayOrder', 'Display Order', { type: 'number', min: 0, max: 9999 })}

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="mf-status">Status</label>
            <select
              id="mf-status"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
              className="w-full bg-[#080e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="DRAFT">Draft (hidden from directory)</option>
              <option value="ACTIVE">Active (visible in directory)</option>
              <option value="INACTIVE">Inactive (hidden from directory)</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Grant Access Modal ────────────────────────────────────────────────────────

function GrantAccessModal({
  users, existingGrants, onClose, onGranted,
}: {
  users: UserOption[]
  existingGrants: AccessGrant[]
  onClose: () => void
  onGranted: (grant: AccessGrant) => void
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [isTeamAdmin, setIsTeamAdmin] = useState(false)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const alreadyGranted = new Set(existingGrants.filter(g => !g.isRevoked).map(g => g.userId))

  const filtered = users
    .filter(u => !alreadyGranted.has(u.id))
    .filter(u =>
      !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(search.toLowerCase())
    )
    .slice(0, 20)

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserId) { toast.error('Select a user first'); return }
    setSaving(true)

    try {
      const res = await fetch('/api/admin/team/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, isTeamAdmin }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Grant failed')
        setSaving(false)
        return
      }
      const d = await res.json()
      toast.success('Team access granted')
      onGranted(d.access)
      onClose()
    } catch {
      toast.error('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1623] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">Grant Team Access</h2>
        <form onSubmit={handleGrant} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1" htmlFor="grant-search">Search User</label>
            <input
              id="grant-search"
              type="text"
              placeholder="Search by email or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 mb-2"
            />
            <div className="max-h-48 overflow-y-auto border border-white/10 rounded-lg divide-y divide-white/5">
              {filtered.length === 0 ? (
                <p className="text-xs text-slate-500 p-3">No matching users found</p>
              ) : (
                filtered.map(u => (
                  <label key={u.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/5">
                    <input
                      type="radio"
                      name="grantUserId"
                      value={u.id}
                      checked={selectedUserId === u.id}
                      onChange={() => setSelectedUserId(u.id)}
                      className="accent-blue-500"
                    />
                    <div>
                      <p className="text-sm text-white">{u.name || u.email}</p>
                      {u.name && <p className="text-xs text-slate-500">{u.email}</p>}
                      <p className="text-xs text-slate-600">{u.role}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isTeamAdmin}
              onChange={e => setIsTeamAdmin(e.target.checked)}
              className="accent-blue-500"
              id="grant-admin"
            />
            <span className="text-sm text-slate-300">Grant team administration rights</span>
          </label>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
            <button
              type="submit"
              disabled={saving || !selectedUserId}
              className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {saving ? 'Granting…' : 'Grant Access'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tab component ─────────────────────────────────────────────────────────────

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TeamAdminClient({ initialMembers, initialAccessGrants, users }: Props) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [grants, setGrants] = useState<AccessGrant[]>(initialAccessGrants)
  const [tab, setTab] = useState<'members' | 'access'>('members')
  const [editingMember, setEditingMember] = useState<TeamMember | null | undefined>(undefined)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [confirm, setConfirm] = useState<{
    open: boolean; title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void
  }>({ open: false, title: '', message: '', confirmLabel: '', onConfirm: () => {} })

  // ── Member handlers ──────────────────────────────────────────────────────

  const handleMemberSaved = useCallback((saved: TeamMember) => {
    setMembers(prev => {
      const idx = prev.findIndex(m => m.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...prev[idx], ...saved }
        return next.sort((a, b) => a.displayOrder - b.displayOrder)
      }
      return [...prev, saved].sort((a, b) => a.displayOrder - b.displayOrder)
    })
  }, [])

  const handleToggleStatus = useCallback(async (member: TeamMember) => {
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    const label = newStatus === 'ACTIVE' ? 'activate' : 'deactivate'

    setConfirm({
      open: true,
      title: `${newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate'} profile`,
      message: `Are you sure you want to ${label} ${member.displayName}'s profile?`,
      confirmLabel: newStatus === 'ACTIVE' ? 'Activate' : 'Deactivate',
      danger: newStatus === 'INACTIVE',
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }))
        const res = await fetch(`/api/admin/team/members/${member.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        })
        if (res.ok) {
          const d = await res.json()
          handleMemberSaved(d.member)
          toast.success(`Profile ${label}d`)
        } else {
          const d = await res.json()
          toast.error(d.error || 'Update failed')
        }
      },
    })
  }, [handleMemberSaved])

  const handleDeleteMember = useCallback((member: TeamMember) => {
    setConfirm({
      open: true,
      title: 'Delete profile',
      message: `Delete ${member.displayName}'s team profile? The user account and directory access are NOT affected.`,
      confirmLabel: 'Delete Profile',
      danger: true,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }))
        const res = await fetch(`/api/admin/team/members/${member.id}`, { method: 'DELETE' })
        if (res.ok) {
          setMembers(prev => prev.filter(m => m.id !== member.id))
          toast.success('Profile deleted')
        } else {
          const d = await res.json()
          toast.error(d.error || 'Delete failed')
        }
      },
    })
  }, [])

  // ── Access handlers ──────────────────────────────────────────────────────

  const handleRevokeAccess = useCallback((grant: AccessGrant) => {
    setConfirm({
      open: true,
      title: 'Revoke team access',
      message: `Remove ${grant.user.email}'s access to the private team directory?`,
      confirmLabel: 'Revoke Access',
      danger: true,
      onConfirm: async () => {
        setConfirm(c => ({ ...c, open: false }))
        const res = await fetch(`/api/admin/team/access/${grant.id}`, { method: 'DELETE' })
        if (res.ok) {
          setGrants(prev => prev.map(g => g.id === grant.id ? { ...g, isRevoked: true, revokedAt: new Date().toISOString() } : g))
          toast.success('Access revoked')
        } else {
          const d = await res.json()
          toast.error(d.error || 'Revoke failed')
        }
      },
    })
  }, [])

  const handleToggleAdmin = useCallback(async (grant: AccessGrant) => {
    const newVal = !grant.isTeamAdmin
    const res = await fetch(`/api/admin/team/access/${grant.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTeamAdmin: newVal }),
    })
    if (res.ok) {
      setGrants(prev => prev.map(g => g.id === grant.id ? { ...g, isTeamAdmin: newVal } : g))
      toast.success(newVal ? 'Admin rights granted' : 'Admin rights removed')
    } else {
      const d = await res.json()
      toast.error(d.error || 'Update failed')
    }
  }, [])

  // ── Render ───────────────────────────────────────────────────────────────

  const activeGrants = grants.filter(g => !g.isRevoked)
  const revokedGrants = grants.filter(g => g.isRevoked)

  return (
    <div className="min-h-full text-white">
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e2a3a', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' } }} />

      {/* Confirm dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        danger={confirm.danger}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
      />

      {/* Member form modal */}
      {editingMember !== undefined && (
        <MemberFormModal
          member={editingMember}
          onClose={() => setEditingMember(undefined)}
          onSaved={handleMemberSaved}
        />
      )}

      {/* Grant access modal */}
      {showGrantModal && (
        <GrantAccessModal
          users={users}
          existingGrants={grants}
          onClose={() => setShowGrantModal(false)}
          onGranted={g => setGrants(prev => [g, ...prev])}
        />
      )}

      {/* Page header */}
      <div className="border-b border-white/5 px-6 py-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Team Directory</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage profiles and access for the private <code className="text-xs text-blue-400">/team</code> page
            </p>
          </div>
          <div className="flex gap-2">
            {tab === 'members' && (
              <button
                onClick={() => setEditingMember(null)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Profile
              </button>
            )}
            {tab === 'access' && (
              <button
                onClick={() => setShowGrantModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Grant Access
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 border border-white/10 rounded-lg p-1 w-fit">
          <Tab active={tab === 'members'} onClick={() => setTab('members')}>
            Profiles ({members.length})
          </Tab>
          <Tab active={tab === 'access'} onClick={() => setTab('access')}>
            Access ({activeGrants.length} active)
          </Tab>
        </div>

        {/* ── Members tab ── */}
        {tab === 'members' && (
          <div>
            {members.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
                <p className="text-slate-500 text-sm mb-4">No team member profiles yet.</p>
                <button onClick={() => setEditingMember(null)} className="text-blue-400 hover:text-blue-300 text-sm">
                  Add the first profile →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(m => (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-colors"
                  >
                    {/* Order handle */}
                    <span className="text-slate-700 font-mono text-xs w-6 text-right flex-shrink-0">
                      {m.displayOrder}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white">{m.displayName}</p>
                        <StatusBadge status={m.status} />
                      </div>
                      {m.designation && (
                        <p className="text-xs text-slate-500 truncate">{m.designation}</p>
                      )}
                      {m.user && (
                        <p className="text-xs text-slate-600">{m.user.email}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleStatus(m)}
                        title={m.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg transition-colors text-xs ${
                          m.status === 'ACTIVE'
                            ? 'text-emerald-400 hover:bg-emerald-900/20'
                            : 'text-slate-500 hover:bg-white/5'
                        }`}
                      >
                        {m.status === 'ACTIVE' ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setEditingMember(m)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                        title="Edit profile"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteMember(m)}
                        className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                        title="Delete profile"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Access tab ── */}
        {tab === 'access' && (
          <div className="space-y-6">
            {/* Active grants */}
            <div>
              <h2 className="text-sm font-medium text-slate-400 mb-3">Active Access ({activeGrants.length})</h2>
              {activeGrants.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl">
                  <p className="text-slate-500 text-sm">No team members have directory access yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeGrants.map(g => (
                    <div key={g.id} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 hover:border-white/20 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{g.user.name || g.user.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {g.user.name && <span className="text-xs text-slate-500">{g.user.email}</span>}
                          <span className="text-xs text-slate-600">{g.user.role}</span>
                          {g.isTeamAdmin && (
                            <span className="text-xs text-blue-400 border border-blue-800/40 bg-blue-900/20 px-1.5 py-0.5 rounded">
                              Team Admin
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleToggleAdmin(g)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                            g.isTeamAdmin
                              ? 'text-blue-400 border-blue-800/40 hover:bg-blue-900/20'
                              : 'text-slate-500 border-white/10 hover:border-white/20'
                          }`}
                          title={g.isTeamAdmin ? 'Remove admin rights' : 'Grant admin rights'}
                        >
                          {g.isTeamAdmin ? 'Admin ✓' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleRevokeAccess(g)}
                          className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
                          title="Revoke access"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Revoked grants */}
            {revokedGrants.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-600 mb-3">Revoked ({revokedGrants.length})</h2>
                <div className="space-y-2 opacity-60">
                  {revokedGrants.map(g => (
                    <div key={g.id} className="flex items-center gap-4 bg-white/3 border border-white/5 rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-500 line-through">{g.user.name || g.user.email}</p>
                        <p className="text-xs text-slate-600">
                          Revoked {g.revokedAt ? new Date(g.revokedAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <span className="text-xs text-red-500 border border-red-900/40 bg-red-900/10 px-2 py-0.5 rounded">
                        Revoked
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
