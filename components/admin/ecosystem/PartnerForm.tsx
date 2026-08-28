'use client'

import { useRouter } from 'next/navigation'
import { usePartnerForm, type PartnerCoreFields } from './hooks/usePartnerForm'
import { useUnsavedChanges } from './hooks/useUnsavedChanges'
import PartnerIdentitySection from './sections/PartnerIdentitySection'
import PartnerMediaSection from './sections/PartnerMediaSection'
import PartnerCategorySection from './sections/PartnerCategorySection'
import PartnerGovernanceSection from './sections/PartnerGovernanceSection'
import PartnerSeoSection from './sections/PartnerSeoSection'

type Category = { id: string; slug: string; title: string }

type PartnerFormProps = {
  mode: 'create' | 'edit'
  categories: Category[]
  initial?: Partial<PartnerCoreFields> & { id?: string }
}

export default function PartnerForm({ mode, categories, initial }: PartnerFormProps) {
  const router = useRouter()
  const {
    form,
    saving,
    setSaving,
    error,
    setError,
    successMessage,
    setSuccessMessage,
    isEdit,
    isDirty,
    updateField,
    updateCategoryData,
    handleChange,
    buildPayload,
  } = usePartnerForm(initial)

  useUnsavedChanges(isDirty)

  const categorySlug =
    form.categorySlug || categories.find((c) => c.id === form.categoryId)?.slug || ''

  const handleCategoryChange = (categoryId: string, slug: string) => {
    updateField('categoryId', categoryId)
    updateField('categorySlug', slug)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return

    setSaving(true)
    setError('')
    setSuccessMessage('')

    if (!form.categoryId) {
      setError('Category is required.')
      setSaving(false)
      return
    }
    if (!form.name.trim()) {
      setError('Business name is required.')
      setSaving(false)
      return
    }

    try {
      const payload = buildPayload()
      const url = isEdit
        ? `/api/admin/ecosystem-partners/manage/${initial!.id}`
        : '/api/admin/ecosystem-partners/manage'

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.message || 'Save failed')

      setSuccessMessage(isEdit ? 'Partner updated successfully.' : 'Partner created successfully.')

      setTimeout(() => {
        router.push('/admin/ecosystem-partners/manage')
        router.refresh()
      }, 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {isEdit ? `Edit ${form.name || 'Partner'}` : 'Add Ecosystem Partner'}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {isEdit
              ? 'Update partner profile, media, and category-specific details.'
              : 'Create a new partner profile for the ecosystem directory.'}
          </p>
        </div>
        {isEdit && categorySlug && (
          <span className="rounded-lg border border-accent-yellow/20 bg-accent-yellow/10 px-3 py-1.5 text-xs font-semibold text-accent-yellow">
            {categories.find((c) => c.slug === categorySlug)?.title || categorySlug}
          </span>
        )}
      </div>

      {/* Section 1: Identity & Stats */}
      <PartnerIdentitySection
        form={form}
        categories={categories}
        isEdit={isEdit}
        updateField={updateField}
        handleChange={handleChange}
        onCategoryChange={handleCategoryChange}
      />

      {/* Section 2: Media Upload */}
      <PartnerMediaSection
        partnerId={initial?.id}
        logo={form.logo}
        coverImage={form.coverImage}
        onLogoUploaded={(url) => updateField('logo', url)}
        onCoverUploaded={(url) => updateField('coverImage', url)}
        onLogoDeleted={() => updateField('logo', '')}
        onCoverDeleted={() => updateField('coverImage', '')}
      />

      {/* Section 3: Category-Specific Fields (dynamic) */}
      <PartnerCategorySection
        categorySlug={categorySlug}
        categoryData={form.categoryData}
        onFieldChange={updateCategoryData}
      />

      {/* Section 4: Governance */}
      <PartnerGovernanceSection
        form={form}
        updateField={updateField}
        handleChange={handleChange}
      />

      {/* Section 5: SEO */}
      <PartnerSeoSection
        form={form}
        handleChange={handleChange}
      />

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-sm font-medium text-red-400">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
          <p className="text-sm font-medium text-green-400">{successMessage}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-11 items-center rounded-xl bg-accent-yellow px-6 text-sm font-semibold text-dark-blue transition-all hover:brightness-110 disabled:opacity-60"
        >
          {saving ? 'Saving...' : isEdit ? 'Update Partner' : 'Create Partner'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/ecosystem-partners/manage')}
          className="inline-flex h-11 items-center rounded-xl border border-white/10 px-6 text-sm font-medium text-white/60 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        {isDirty && (
          <span className="ml-auto text-xs text-amber-400/60">• Unsaved changes</span>
        )}
      </div>

      {/* Shared field styles */}
      <style jsx global>{`
        .eco-field {
          margin-top: 0.25rem;
          height: 2.75rem;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: #0b1220;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          color: white;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .eco-field:focus {
          border-color: rgba(var(--accent-yellow-rgb, 255, 202, 40), 0.5);
          box-shadow: 0 0 0 2px rgba(var(--accent-yellow-rgb, 255, 202, 40), 0.1);
        }
        .eco-textarea {
          height: auto;
          padding: 0.75rem;
          min-height: 5rem;
          resize: vertical;
        }
      `}</style>
    </form>
  )
}
