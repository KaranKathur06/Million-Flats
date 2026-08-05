'use client'

/**
 * AuthSettingsClient.tsx
 *
 * Premium admin panel for managing authentication modes.
 * SUPERADMIN can toggle auth modes in real-time without redeployment.
 * Features: radio group for modes, feature toggles, danger zone, audit trail.
 */

import { useState, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface AuthSettingsData {
  activeMode: string
  allowEmail: boolean
  allowWhatsapp: boolean
  allowGoogle: boolean
  allowApple: boolean
  allowPasskeys: boolean
  allowRegistration: boolean
  allowForgotPassword: boolean
  requireEmailVerification: boolean
  allowMultipleSessions: boolean
  requireMfa: boolean
  maintenanceMessage: string | null
  updatedAt: string
}

interface AuditEntry {
  id: string
  action: string
  createdAt: string
  performedByUser?: { name: string | null; email: string }
  beforeState?: any
  afterState?: any
  meta?: any
}

interface Props {
  initialSettings: AuthSettingsData | null
  recentAuditLogs: AuditEntry[]
}

const AUTH_MODES = [
  {
    value: 'WHATSAPP_ONLY',
    label: 'WhatsApp Only',
    description: 'Users sign in exclusively via WhatsApp OTP. Premium experience.',
    icon: (
      <svg className="w-5 h-5 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
    color: 'border-[#25D366] bg-[#25D366]/5',
  },
  {
    value: 'EMAIL_ONLY',
    label: 'Email Only',
    description: 'Traditional email & password login. Familiar for all users.',
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    color: 'border-blue-500 bg-blue-50',
  },
  {
    value: 'EMAIL_AND_WHATSAPP',
    label: 'Email + WhatsApp',
    description: 'Users choose between WhatsApp OTP or email/password. Maximum flexibility.',
    icon: (
      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    color: 'border-purple-500 bg-purple-50',
  },
  {
    value: 'DISABLED',
    label: 'Maintenance Mode',
    description: 'All login disabled. Show maintenance message to users.',
    icon: (
      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    ),
    color: 'border-red-400 bg-red-50',
  },
]

const DEFAULT_SETTINGS: AuthSettingsData = {
  activeMode: 'WHATSAPP_ONLY',
  allowEmail: true,
  allowWhatsapp: true,
  allowGoogle: false,
  allowApple: false,
  allowPasskeys: false,
  allowRegistration: true,
  allowForgotPassword: true,
  requireEmailVerification: true,
  allowMultipleSessions: true,
  requireMfa: false,
  maintenanceMessage: null,
  updatedAt: new Date().toISOString(),
}

export default function AuthSettingsClient({ initialSettings, recentAuditLogs }: Props) {
  const { data: session } = useSession()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isSuperAdmin = role === 'SUPERADMIN'

  const [settings, setSettings] = useState<AuthSettingsData>(initialSettings || DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [maintenanceMsg, setMaintenanceMsg] = useState(initialSettings?.maintenanceMessage || '')
  const [showForceLogout, setShowForceLogout] = useState(false)

  // Fetch fresh settings on mount
  useEffect(() => {
    fetch('/api/admin/auth-settings')
      .then(r => r.json())
      .then(data => {
        if (data?.settings) {
          setSettings(data.settings)
          setMaintenanceMsg(data.settings.maintenanceMessage || '')
        }
      })
      .catch(() => {})
  }, [])

  const handleSave = useCallback(async () => {
    if (!isSuperAdmin) return
    setSaving(true)
    setError('')
    setSaved(false)

    try {
      const payload: any = {
        activeMode: settings.activeMode,
        allowEmail: settings.allowEmail,
        allowWhatsapp: settings.allowWhatsapp,
        allowGoogle: settings.allowGoogle,
        allowRegistration: settings.allowRegistration,
        allowForgotPassword: settings.allowForgotPassword,
        requireEmailVerification: settings.requireEmailVerification,
        allowMultipleSessions: settings.allowMultipleSessions,
        requireMfa: settings.requireMfa,
        maintenanceMessage: settings.activeMode === 'DISABLED' ? maintenanceMsg : null,
      }

      const res = await fetch('/api/admin/auth-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data?.error || 'Failed to save settings.')
        return
      }

      if (data?.settings) setSettings(data.settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [settings, maintenanceMsg, isSuperAdmin])

  const handleForceLogout = useCallback(async () => {
    // This would call a force-logout endpoint
    setShowForceLogout(false)
    // TODO: Implement force logout endpoint
    alert('Force logout functionality will be implemented with session revocation.')
  }, [])

  const updateField = (field: keyof AuthSettingsData, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Authentication Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Control how users sign in to MillionFlats. Changes take effect within seconds — no redeployment needed.
        </p>
      </div>

      {/* Read-only notice for non-SUPERADMIN */}
      {!isSuperAdmin && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Read-only Access</p>
            <p className="text-sm text-amber-700 mt-0.5">Only Super Admins can modify authentication settings.</p>
          </div>
        </div>
      )}

      {/* ─── Authentication Mode ──────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Authentication Mode</h2>
          <p className="text-sm text-gray-500 mt-0.5">Choose how users sign in to the platform</p>
        </div>
        <div className="p-6 space-y-3">
          {AUTH_MODES.map(mode => (
            <label
              key={mode.value}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all
                ${settings.activeMode === mode.value ? mode.color : 'border-gray-100 bg-white hover:border-gray-200'}
                ${!isSuperAdmin ? 'pointer-events-none opacity-75' : ''}
              `}
            >
              <input
                type="radio"
                name="authMode"
                value={mode.value}
                checked={settings.activeMode === mode.value}
                onChange={() => updateField('activeMode', mode.value)}
                disabled={!isSuperAdmin}
                className="mt-1 h-4 w-4 accent-[#25D366]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {mode.icon}
                  <span className="text-sm font-semibold text-gray-900">{mode.label}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{mode.description}</p>
              </div>
            </label>
          ))}

          {/* Maintenance message */}
          {settings.activeMode === 'DISABLED' && (
            <div className="mt-4 pl-10">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Maintenance Message</label>
              <textarea
                value={maintenanceMsg}
                onChange={e => setMaintenanceMsg(e.target.value)}
                disabled={!isSuperAdmin}
                placeholder="We are performing scheduled maintenance. Login will be restored shortly."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:border-gray-400 focus:ring-1 focus:ring-gray-300 outline-none disabled:opacity-50"
              />
            </div>
          )}
        </div>
      </div>

      {/* ─── Feature Toggles ──────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Feature Toggles</h2>
          <p className="text-sm text-gray-500 mt-0.5">Fine-grained control over authentication features</p>
        </div>
        <div className="divide-y divide-gray-100">
          {[
            { key: 'allowWhatsapp' as const, label: 'Enable WhatsApp Login', desc: 'Allow login via WhatsApp OTP verification' },
            { key: 'allowEmail' as const, label: 'Enable Email Login', desc: 'Allow traditional email/password authentication' },
            { key: 'allowRegistration' as const, label: 'Allow New Registrations', desc: 'Allow new users to create accounts' },
            { key: 'allowForgotPassword' as const, label: 'Allow Password Reset', desc: 'Allow users to reset their password via email' },
            { key: 'requireEmailVerification' as const, label: 'Require Email Verification', desc: 'New accounts must verify their email before accessing features' },
            { key: 'allowMultipleSessions' as const, label: 'Allow Multiple Sessions', desc: 'Users can be logged in on multiple devices simultaneously' },
            { key: 'requireMfa' as const, label: 'Require MFA', desc: 'Require multi-factor authentication (coming soon)' },
          ].map(toggle => (
            <div key={toggle.key} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{toggle.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{toggle.desc}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(settings[toggle.key])}
                disabled={!isSuperAdmin || toggle.key === 'requireMfa'}
                onClick={() => updateField(toggle.key, !settings[toggle.key])}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings[toggle.key] ? 'bg-[#25D366]' : 'bg-gray-200'
                } ${!isSuperAdmin || toggle.key === 'requireMfa' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                  settings[toggle.key] ? 'translate-x-5' : ''
                }`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Save Button ──────────────────────────────────────────────── */}
      {isSuperAdmin && (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {saving ? 'Saving…' : 'Save Changes'}
          </button>

          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 animate-[fadeIn_0.3s_ease]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Changes are live! Users will see the update within seconds.
            </span>
          )}

          {error && (
            <span className="text-sm text-red-600">{error}</span>
          )}
        </div>
      )}

      {/* ─── Danger Zone ──────────────────────────────────────────────── */}
      {isSuperAdmin && (
        <div className="bg-white border-2 border-red-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-red-100 bg-red-50/50">
            <h2 className="text-base font-semibold text-red-800">Danger Zone</h2>
            <p className="text-sm text-red-600 mt-0.5">Destructive actions — proceed with caution</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Force Logout All Users</p>
                <p className="text-xs text-gray-500">Immediately terminate all active sessions platform-wide</p>
              </div>
              <button
                type="button"
                onClick={() => setShowForceLogout(true)}
                className="px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Force Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Audit Trail ──────────────────────────────────────────────── */}
      {recentAuditLogs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-base font-semibold text-gray-900">Recent Changes</h2>
            <p className="text-sm text-gray-500 mt-0.5">Last 10 authentication configuration changes</p>
          </div>
          <div className="divide-y divide-gray-100">
            {recentAuditLogs.map(log => (
              <div key={log.id} className="px-6 py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{log.performedByUser?.name || log.performedByUser?.email || 'Unknown'}</span>
                    {' '}updated auth settings
                    {log.meta?.changedFields && (
                      <span className="text-gray-500"> — changed: {(log.meta.changedFields as string[]).join(', ')}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Force Logout Confirmation Dialog */}
      {showForceLogout && (
        <>
          <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={() => setShowForceLogout(false)} />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Force Logout All Users</h3>
              <p className="text-sm text-gray-600">
                This will immediately terminate <strong>all active sessions</strong> across the platform.
                All users will be required to sign in again. This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleForceLogout}
                  className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                >
                  Force Logout Everyone
                </button>
                <button
                  type="button"
                  onClick={() => setShowForceLogout(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
