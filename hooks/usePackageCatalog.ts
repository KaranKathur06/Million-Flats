'use client'

import { useEffect, useState } from 'react'

export type PackageQuote = {
  pricePaise: number
  taxAmountPaise: number
  totalAmountPaise: number
}

export type PackageCatalogState =
  | { status: 'loading' }
  | { status: 'ready'; quotes: Record<string, PackageQuote> }
  | { status: 'unconfigured' }
  | { status: 'error' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidQuote(value: unknown): value is PackageQuote {
  if (!isRecord(value)) return false
  const { pricePaise, taxAmountPaise, totalAmountPaise } = value
  return Number.isSafeInteger(pricePaise)
    && Number.isSafeInteger(taxAmountPaise)
    && Number.isSafeInteger(totalAmountPaise)
    && Number(pricePaise) >= 0
    && Number(taxAmountPaise) >= 0
    && Number(totalAmountPaise) === Number(pricePaise) + Number(taxAmountPaise)
}

export function mapPackageCatalogResponse(data: unknown, packageIds: string[]): PackageCatalogState {
  if (!isRecord(data) || data.success !== true || typeof data.taxConfigured !== 'boolean') {
    return { status: 'error' }
  }

  if (data.taxConfigured === false) return { status: 'unconfigured' }
  if (!Array.isArray(data.packages)) return { status: 'error' }

  const quotes: Record<string, PackageQuote> = {}
  for (const packageId of packageIds) {
    const matchingEntries = data.packages.filter((entry) => isRecord(entry) && entry.id === packageId)
    if (matchingEntries.length !== 1 || !isRecord(matchingEntries[0]) || !isValidQuote(matchingEntries[0].quote)) {
      return { status: 'error' }
    }
    quotes[packageId] = matchingEntries[0].quote
  }

  return { status: 'ready', quotes }
}

export async function loadPackageCatalog(
  packageIds: string[],
  fetcher: typeof fetch = fetch,
): Promise<PackageCatalogState> {
  try {
    const response = await fetcher('/api/packages/catalog', { cache: 'no-store' })
    if (!response.ok) return { status: 'error' }
    return mapPackageCatalogResponse(await response.json(), packageIds)
  } catch {
    return { status: 'error' }
  }
}

export function usePackageCatalog(packageIds: string[]) {
  const [state, setState] = useState<PackageCatalogState>({ status: 'loading' })
  const [retryCount, setRetryCount] = useState(0)
  const packageIdsKey = JSON.stringify(packageIds)

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    void loadPackageCatalog(JSON.parse(packageIdsKey) as string[]).then((nextState) => {
      if (active) setState(nextState)
    })
    return () => { active = false }
  }, [packageIdsKey, retryCount])

  return {
    state,
    retry: () => setRetryCount((count) => count + 1),
  }
}