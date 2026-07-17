'use client'

import { useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import GlobalDropdown from '@/components/ui/GlobalDropdown'

type RoleItem = { value: string; label: string; emoji: string; description: string; count: number }

export default function RoleSelect({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const loadOptions = useCallback(async () => {
    const res = await fetch('/api/admin/roles')
    const json = await res.json()
    if (!json?.success) return []
    return json.items || []
  }, [])

  const onChange = useCallback((value: string | string[]) => {
    const v = typeof value === 'string' ? value : (value[0] || '')
    const params = new URLSearchParams(Array.from(searchParams?.entries() || []))
    if (v) params.set('role', v)
    else params.delete('role')
    const q = params.toString()
    router.push(`${pathname}${q ? `?${q}` : ''}`)
  }, [router, pathname, searchParams])

  const current = searchParams?.get('role') || ''

  return (
    <div style={{ minWidth: 340 }} className={className}>
      <GlobalDropdown
        name="role"
        label="Role"
        value={current}
        onChange={onChange}
        loadOptions={loadOptions}
        placeholder="All roles"
        searchable
        appearance="admin-dark"
        dense
        renderOption={(o: any, selected: boolean) => (
          <div className="flex items-start gap-3">
            <div className="text-lg leading-none">{o.emoji}</div>
            <div className="min-w-0">
              <div className={`flex items-center gap-3 ${selected ? 'font-semibold' : ''}`}>
                <div className="truncate">{o.label}</div>
                <div className="ml-2 text-xs text-white/50">{o.count?.toLocaleString?.() || 0}</div>
              </div>
              <div className="text-xs text-white/40 truncate">{o.description}</div>
            </div>
          </div>
        )}
      />
    </div>
  )
}
