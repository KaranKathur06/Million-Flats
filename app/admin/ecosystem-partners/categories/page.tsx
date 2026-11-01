'use client'

import { useCallback, useEffect, useState } from 'react'

type Category = {
  id: string
  slug: string
  title: string
  description: string
  heroImage: string
  metaTitle: string
  metaDescription: string
  priorityOrder: number
  isActive: boolean
}

const EMPTY_CATEGORY: Omit<Category, 'id'> = {
  slug: '',
  title: '',
  description: '',
  heroImage: '',
  metaTitle: '',
  metaDescription: '',
  priorityOrder: 0,
  isActive: true,
}

export default function EcosystemCategoriesAdminPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [draft, setDraft] = useState(EMPTY_CATEGORY)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/ecosystem-partners/categories', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load categories.')
      setCategories(payload.data)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load categories.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const saveCategory = async (category: Category) => {
    setSavingId(category.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/ecosystem-partners/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to save category.')
      setNotice(`Saved ${category.title}.`)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save category.')
    } finally {
      setSavingId(null)
    }
  }

  const createCategory = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/admin/ecosystem-partners/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to create category.')
      setDraft(EMPTY_CATEGORY)
      setNotice(`Created ${payload.data.title}.`)
      await load()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create category.')
    }
  }

  return (
    <main className="space-y-6 p-6 text-white">
      <header>
        <h1 className="text-2xl font-bold">Ecosystem Categories</h1>
        <p className="mt-1 text-sm text-white/60">Manage category routes, education content, SEO and directory availability.</p>
      </header>

      {error ? <div role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}
      {notice ? <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</div> : null}

      <form onSubmit={createCategory} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
        <h2 className="md:col-span-2 text-lg font-semibold">Add category</h2>
        <label className="text-sm">Title<input required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
        <label className="text-sm">Route slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
        <label className="text-sm">Description<textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
        <label className="text-sm">Hero image URL<input value={draft.heroImage} onChange={(e) => setDraft({ ...draft, heroImage: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
        <label className="text-sm">Meta title<input value={draft.metaTitle} onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
        <label className="text-sm">Meta description<input value={draft.metaDescription} onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
        <label className="text-sm">Order<input type="number" min="0" value={draft.priorityOrder} onChange={(e) => setDraft({ ...draft, priorityOrder: Number(e.target.value) })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} /> Active</label>
        <button type="submit" className="h-10 rounded-lg bg-accent-yellow px-4 font-semibold text-dark-blue md:col-span-2">Create category</button>
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Existing categories</h2>
        {loading ? <p className="text-sm text-white/60">Loading categories…</p> : null}
        {!loading && categories.length === 0 ? <p className="text-sm text-white/60">No categories have been configured.</p> : null}
        {categories.map((category) => (
          <CategoryEditor
            key={category.id}
            category={category}
            saving={savingId === category.id}
            onSave={saveCategory}
            onChange={(next) => setCategories((items) => items.map((item) => item.id === next.id ? next : item))}
          />
        ))}
      </section>
    </main>
  )
}

function CategoryEditor({
  category,
  saving,
  onSave,
  onChange,
}: {
  category: Category
  saving: boolean
  onSave: (category: Category) => void
  onChange: (category: Category) => void
}) {
  return (
    <article className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-2">
      <label className="text-sm">Title<input value={category.title} onChange={(e) => onChange({ ...category, title: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
      <label className="text-sm">Route slug<input value={category.slug} onChange={(e) => onChange({ ...category, slug: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
      <label className="text-sm">Description<textarea value={category.description} onChange={(e) => onChange({ ...category, description: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
      <label className="text-sm">Hero image URL<input value={category.heroImage} onChange={(e) => onChange({ ...category, heroImage: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
      <label className="text-sm">Meta title<input value={category.metaTitle} onChange={(e) => onChange({ ...category, metaTitle: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
      <label className="text-sm">Meta description<input value={category.metaDescription} onChange={(e) => onChange({ ...category, metaDescription: e.target.value })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
      <label className="text-sm">Order<input type="number" min="0" value={category.priorityOrder} onChange={(e) => onChange({ ...category, priorityOrder: Number(e.target.value) })} className="mt-1 block w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={category.isActive} onChange={(e) => onChange({ ...category, isActive: e.target.checked })} /> Active</label>
      <button type="button" disabled={saving} onClick={() => onSave(category)} className="h-10 rounded-lg border border-white/15 px-4 text-sm font-semibold disabled:opacity-50 md:col-span-2">{saving ? 'Saving…' : 'Save category'}</button>
    </article>
  )
}
