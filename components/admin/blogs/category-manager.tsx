'use client'

import { useState, useRef, useEffect } from 'react'

interface Category {
  id: string
  name: string
  slug: string
  description?: string
  _count?: { blogs: number }
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─── Toast Component ─────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 ${
        type === 'success'
          ? 'bg-emerald-500/15 border-emerald-400/25 text-emerald-300'
          : 'bg-red-500/15 border-red-400/25 text-red-300'
      }`}>
        {type === 'success' ? (
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  )
}

// ─── Confirmation Modal ──────────────────────────────────
function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  isLoading,
}: {
  isOpen: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-[#0f1825] p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm text-white/60">{message}</p>
        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-red-500/20 border border-red-400/30 hover:bg-red-500/30 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Deleting...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main CategoryManager ────────────────────────────────
export function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }

  // ─── Create ─────────────────────────────────────────────
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return

    setIsCreating(true)
    setError(null)

    try {
      const name = newCategoryName.trim()
      const slug = generateSlug(name)
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to create category')
      }

      setCategories(prev => [...prev, data.data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName('')
      showToast(`Category "${name}" created successfully`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create category'
      setError(msg)
      showToast(msg, 'error')
    } finally {
      setIsCreating(false)
    }
  }

  // ─── Delete ─────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)

    try {
      const res = await fetch(`/api/admin/categories?id=${deleteTarget.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete category')
      }

      setCategories(prev => prev.filter(c => c.id !== deleteTarget.id))
      showToast(`Category "${deleteTarget.name}" deleted`, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete category'
      showToast(msg, 'error')
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
    }
  }

  // ─── Edit ───────────────────────────────────────────────
  const startEditing = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditDescription(cat.description || '')
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditName('')
    setEditDescription('')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return

    setIsSavingEdit(true)

    try {
      const slug = generateSlug(editName.trim())
      const res = await fetch('/api/admin/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name: editName.trim(),
          slug,
          description: editDescription.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update category')
      }

      setCategories(prev =>
        prev.map(c => (c.id === editingId ? data.data : c)).sort((a, b) => a.name.localeCompare(b.name))
      )
      showToast(`Category updated to "${editName.trim()}"`, 'success')
      cancelEditing()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update category'
      showToast(msg, 'error')
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>

      <div className="space-y-6">
        {/* Create Category Form */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Category
          </h2>
          <form onSubmit={handleCreateCategory} className="flex gap-3">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name (e.g., Dubai, India, Real Estate Tips)"
              className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-white/30 focus:outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all duration-200"
              disabled={isCreating}
            />
            <button
              type="submit"
              disabled={isCreating || !newCategoryName.trim()}
              className="h-10 px-5 rounded-xl text-[13px] font-bold transition-all duration-200 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </span>
              ) : 'Create'}
            </button>
          </form>
          {error && (
            <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </p>
          )}
        </div>

        {/* Categories List */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
              <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              Existing Categories
            </h2>
            <span className="text-xs text-white/30">{categories.length} total</span>
          </div>

          {categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`group rounded-xl border transition-all duration-200 ${
                    editingId === cat.id
                      ? 'border-amber-400/30 bg-amber-400/[0.04]'
                      : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  {editingId === cat.id ? (
                    /* ─── Edit Mode ─── */
                    <div className="px-4 py-3.5 space-y-3">
                      <div className="flex gap-3">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit() }
                            if (e.key === 'Escape') cancelEditing()
                          }}
                          className="flex-1 px-3 py-2 rounded-lg border border-white/[0.12] bg-white/[0.06] text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-400/50 transition-all duration-200"
                          placeholder="Category name..."
                        />
                      </div>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleSaveEdit() }
                          if (e.key === 'Escape') cancelEditing()
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-white/[0.08] bg-white/[0.04] text-white text-sm placeholder-white/30 focus:outline-none focus:border-amber-400/40 transition-all duration-200"
                        placeholder="Description (optional)..."
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEditing}
                          disabled={isSavingEdit}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white/50 border border-white/[0.08] hover:text-white/70 hover:bg-white/[0.04] transition-all duration-200 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={isSavingEdit || !editName.trim()}
                          className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 bg-gradient-to-r from-amber-400 to-amber-500 text-[#0b1220] disabled:opacity-50"
                        >
                          {isSavingEdit ? (
                            <span className="flex items-center gap-1.5">
                              <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Saving...
                            </span>
                          ) : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ─── View Mode ─── */
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-400/15 to-amber-500/10 border border-amber-400/20 flex items-center justify-center text-xs font-bold text-amber-300">
                          {cat.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white/85">{cat.name}</p>
                          <p className="text-xs text-white/40">/{cat.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-white/40 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                          {cat._count?.blogs || 0} blog{(cat._count?.blogs || 0) !== 1 ? 's' : ''}
                        </span>

                        {/* Action Buttons — visible on hover */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => startEditing(cat)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-amber-300 hover:bg-amber-400/10 border border-transparent hover:border-amber-400/20 transition-all duration-200"
                            title="Edit category"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(cat)}
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-400/20 transition-all duration-200"
                            title="Delete category"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-12 w-12 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <p className="text-sm text-white/40">No categories created yet</p>
              <p className="text-xs text-white/30 mt-1">Create your first category above</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Category"
        message={
          deleteTarget?._count?.blogs && deleteTarget._count.blogs > 0
            ? `"${deleteTarget?.name}" has ${deleteTarget._count.blogs} blog(s). You must reassign or delete those blogs first.`
            : `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isLoading={isDeleting}
      />

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  )
}
