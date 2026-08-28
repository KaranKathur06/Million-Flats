'use client'

import type { PartnerCoreFields } from '../hooks/usePartnerForm'

type Props = {
  form: PartnerCoreFields
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
}

export default function PartnerSeoSection({ form, handleChange }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-bold text-white">SEO & Meta</h2>
      <p className="mt-0.5 text-xs text-white/40">Search engine optimization settings for the partner profile page.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-white/60">Meta Title</span>
          <input name="metaTitle" value={form.metaTitle} onChange={handleChange} className="eco-field" />
          <p className="mt-0.5 text-[10px] text-white/30">
            {form.metaTitle.length}/60 characters
          </p>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-white/60">Meta Description</span>
          <textarea name="metaDescription" value={form.metaDescription} onChange={handleChange} rows={2} className="eco-field eco-textarea" />
          <p className="mt-0.5 text-[10px] text-white/30">
            {form.metaDescription.length}/160 characters
          </p>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-white/60">Meta Keywords</span>
          <input name="metaKeywords" value={form.metaKeywords} onChange={handleChange} placeholder="comma, separated, keywords" className="eco-field" />
        </label>
      </div>
    </div>
  )
}
