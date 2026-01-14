import { Suspense } from 'react'
import ProjectsClient from '@/app/properties/ProjectsClient'
import { reellyFetch } from '@/lib/reelly'

function normalizeListResponse(raw: unknown) {
  if (!raw || typeof raw !== 'object') return { items: [] as unknown[], raw }

  const anyRaw = raw as any
  const items =
    Array.isArray(anyRaw.items)
      ? anyRaw.items
      : Array.isArray(anyRaw.results)
        ? anyRaw.results
        : Array.isArray(anyRaw.data)
          ? anyRaw.data
          : Array.isArray(anyRaw)
            ? anyRaw
            : []

  return { items, raw }
}

export default async function PropertiesPage() {
  const target = 500
  const batchLimit = 50

  let seedItems: unknown[] = []
  let apiError = ''

  try {
    let page = 1
    while (seedItems.length < target) {
      const raw = await reellyFetch<any>(
        '/api/v2/clients/projects',
        {
          limit: batchLimit,
          page,
          sale_status: 'on_sale',
        },
        { cacheTtlMs: 0 }
      )

      const normalized = normalizeListResponse(raw)
      const items = Array.isArray(normalized.items) ? normalized.items : []
      if (items.length === 0) break

      for (const it of items) {
        if (seedItems.length >= target) break
        const status = (it as any)?.sale_status
        if (status === 'on_sale') seedItems.push(it)
      }

      page += 1
      if (page > 200) break
    }
  } catch (e) {
    apiError = e instanceof Error ? e.message : 'Failed to fetch projects.'
  }

  return (
    <Suspense fallback={null}>
      <ProjectsClient seedItems={seedItems} apiError={apiError} />
    </Suspense>
  )
}

