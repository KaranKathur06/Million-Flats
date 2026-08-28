'use client'

import SelectDropdown from '@/components/SelectDropdown'
import type { PartnerCoreFields } from '../hooks/usePartnerForm'

type Category = { id: string; slug: string; title: string }

type Props = {
  form: PartnerCoreFields
  categories: Category[]
  isEdit: boolean
  updateField: (name: keyof PartnerCoreFields, value: string | boolean) => void
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onCategoryChange?: (categoryId: string, slug: string) => void
}

export default function PartnerIdentitySection({
  form,
  categories,
  isEdit,
  updateField,
  handleChange,
  onCategoryChange,
}: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-bold text-white">Partner Identity</h2>
      <p className="mt-0.5 text-xs text-white/40">Core business information and contact details.</p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Category — selectable on create, locked on edit */}
        <div className="sm:col-span-2">
          {isEdit ? (
            <div>
              <span className="text-xs font-semibold text-white/60">Category</span>
              <div className="mt-1 flex h-11 items-center rounded-xl border border-white/10 bg-white/[0.02] px-3">
                <span className="text-sm text-white/80">
                  {categories.find((c) => c.id === form.categoryId)?.title || 'Unknown'}
                </span>
                <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/40">
                  LOCKED
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-white/30">Category cannot be changed after creation.</p>
            </div>
          ) : (
            <SelectDropdown
              label="Category"
              variant="dark"
              value={form.categoryId}
              onChange={(v) => {
                updateField('categoryId', v)
                const cat = categories.find((c) => c.id === v)
                if (cat) {
                  updateField('categorySlug', cat.slug)
                  onCategoryChange?.(v, cat.slug)
                }
              }}
              placeholder="Select category"
              options={[
                { value: '', label: 'Select category' },
                ...categories.map((c) => ({ value: c.id, label: c.title })),
              ]}
            />
          )}
        </div>

        {/* Business Name */}
        <label className="block">
          <span className="text-xs font-semibold text-white/60">Business Name <span className="text-red-400">*</span></span>
          <input name="name" value={form.name} onChange={handleChange} required className="eco-field" />
        </label>

        {/* Slug */}
        <label className="block">
          <span className="text-xs font-semibold text-white/60">Slug</span>
          <input name="slug" value={form.slug} onChange={handleChange} placeholder="auto-generated" className="eco-field" />
        </label>

        {/* Tagline */}
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-white/60">Tagline</span>
          <input name="tagline" value={form.tagline} onChange={handleChange} className="eco-field" />
        </label>

        {/* Short Description */}
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-white/60">Short Description</span>
          <input name="shortDescription" value={form.shortDescription} onChange={handleChange} className="eco-field" />
        </label>

        {/* Full Description */}
        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-white/60">Full Description</span>
          <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="eco-field eco-textarea" />
        </label>

        <div className="sm:col-span-2">
          <div className="my-3 border-t border-white/5" />
          <h3 className="text-sm font-semibold text-white/70">Contact Information</h3>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Contact Person</span>
          <input name="contactPerson" value={form.contactPerson} onChange={handleChange} className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Email</span>
          <input name="contactEmail" type="email" value={form.contactEmail} onChange={handleChange} className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Phone</span>
          <input name="contactPhone" type="tel" value={form.contactPhone} onChange={handleChange} className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">WhatsApp</span>
          <input name="whatsapp" type="tel" value={form.whatsapp} onChange={handleChange} className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Website</span>
          <input name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://" className="eco-field" />
        </label>

        <div className="sm:col-span-2">
          <div className="my-3 border-t border-white/5" />
          <h3 className="text-sm font-semibold text-white/70">Stats & Coverage</h3>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Rating</span>
          <input name="rating" value={form.rating} onChange={handleChange} type="number" step="0.1" min="0" max="5" className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Experience (years)</span>
          <input name="yearsExperience" value={form.yearsExperience} onChange={handleChange} type="number" className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Experience Display</span>
          <input name="experienceDisplay" value={form.experienceDisplay} onChange={handleChange} placeholder='e.g., "25+ Years"' className="eco-field" />
          <p className="mt-0.5 text-[10px] text-white/30">Free-text for display (overrides numeric).</p>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Projects Completed</span>
          <input name="projectsCompleted" value={form.projectsCompleted} onChange={handleChange} type="number" className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Team Size</span>
          <input name="teamSize" value={form.teamSize} onChange={handleChange} type="number" className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Partner Since</span>
          <input name="partnerSince" value={form.partnerSince} onChange={handleChange} type="number" className="eco-field" />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-semibold text-white/60">Location Coverage</span>
          <input name="locationCoverage" value={form.locationCoverage} onChange={handleChange} placeholder="Delhi NCR, Mumbai, Bangalore" className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Pricing Range</span>
          <input name="pricingRange" value={form.pricingRange} onChange={handleChange} className="eco-field" />
        </label>

        <div className="sm:col-span-2">
          <div className="my-3 border-t border-white/5" />
          <h3 className="text-sm font-semibold text-white/70">Business Registration</h3>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">GST Number</span>
          <input name="gstNumber" value={form.gstNumber} onChange={handleChange} className="eco-field" />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-white/60">Registration Number</span>
          <input name="registrationNumber" value={form.registrationNumber} onChange={handleChange} className="eco-field" />
        </label>
      </div>
    </div>
  )
}
