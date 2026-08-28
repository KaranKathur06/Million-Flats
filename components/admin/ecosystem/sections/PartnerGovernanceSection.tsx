'use client'

import SelectDropdown from '@/components/SelectDropdown'
import type { PartnerCoreFields } from '../hooks/usePartnerForm'

type Props = {
  form: PartnerCoreFields
  updateField: (name: keyof PartnerCoreFields, value: string | boolean) => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function PartnerGovernanceSection({ form, updateField, handleChange }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-bold text-white">Governance</h2>
      <p className="mt-0.5 text-xs text-white/40">Status, verification, and visibility controls.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <SelectDropdown
            label="Status"
            variant="dark"
            value={form.status}
            onChange={(v) => updateField('status', v)}
            options={[
              { value: 'PENDING', label: '⏳ Pending' },
              { value: 'APPROVED', label: '✅ Approved' },
              { value: 'REJECTED', label: '❌ Rejected' },
              { value: 'SUSPENDED', label: '⛔ Suspended' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-end gap-5 pb-1">
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer select-none">
            <input
              type="checkbox"
              name="isVerified"
              checked={form.isVerified}
              onChange={handleChange}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-accent-yellow accent-accent-yellow"
            />
            <span>Verified</span>
            <span className="text-[10px] text-white/30">Badge</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer select-none">
            <input
              type="checkbox"
              name="isFeatured"
              checked={form.isFeatured}
              onChange={handleChange}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-accent-yellow accent-accent-yellow"
            />
            <span>Featured</span>
            <span className="text-[10px] text-white/30">Top of list</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer select-none">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-accent-yellow accent-accent-yellow"
            />
            <span>Active</span>
            <span className="text-[10px] text-white/30">Visible</span>
          </label>
        </div>
      </div>

      {/* Status warning box */}
      {form.status === 'SUSPENDED' && (
        <div className="mt-4 rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3">
          <p className="text-xs text-orange-400">
            <strong>Suspended</strong> partners are hidden from all public pages. Active leads are preserved but new leads are paused.
          </p>
        </div>
      )}
      {form.status === 'REJECTED' && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-red-400">
            <strong>Rejected</strong> partners are removed from public directory and deactivated.
          </p>
        </div>
      )}
    </div>
  )
}
