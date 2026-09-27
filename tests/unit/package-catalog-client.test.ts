import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { createRoot } from 'react-dom/client'
import { act, createElement } from 'react'
import { loadPackageCatalog, mapPackageCatalogResponse, usePackageCatalog } from '@/hooks/usePackageCatalog'

const packageId = 'ecosystem-partners:verified-partner-suite'
const validQuote = { pricePaise: 1_900_000, taxAmountPaise: 342_000, totalAmountPaise: 2_242_000 }

afterEach(() => { jest.restoreAllMocks() })

describe('package catalog client contract', () => {
  it('treats a successful response without configured tax as unconfigured', () => {
    expect(mapPackageCatalogResponse({ success: true, taxConfigured: false }, [packageId])).toEqual({ status: 'unconfigured' })
  })

  it('requires one exact package match and a safe, internally consistent quote', () => {
    expect(mapPackageCatalogResponse({
      success: true,
      taxConfigured: true,
      packages: [{ id: packageId, quote: validQuote }],
    }, [packageId])).toEqual({ status: 'ready', quotes: { [packageId]: validQuote } })

    expect(mapPackageCatalogResponse({
      success: true,
      taxConfigured: true,
      packages: [{ id: `${packageId}-other`, quote: validQuote }],
    }, [packageId])).toEqual({ status: 'error' })

    expect(mapPackageCatalogResponse({
      success: true,
      taxConfigured: true,
      packages: [{ id: packageId, quote: { ...validQuote, totalAmountPaise: 1 } }],
    }, [packageId])).toEqual({ status: 'error' })

    expect(mapPackageCatalogResponse({
      success: true,
      taxConfigured: true,
      packages: [{ id: packageId, quote: { ...validQuote, pricePaise: Number.MAX_SAFE_INTEGER + 1 } }],
    }, [packageId])).toEqual({ status: 'error' })
  })

  it('turns HTTP and network failures into a retryable error state', async () => {
    const fetcher = jest.fn<typeof fetch>()
      .mockResolvedValueOnce({ ok: false, json: async () => null } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, taxConfigured: true, packages: [{ id: packageId, quote: validQuote }] }),
      } as Response)

    expect(await loadPackageCatalog([packageId], fetcher)).toEqual({ status: 'error' })
    expect(await loadPackageCatalog([packageId], fetcher)).toEqual({ status: 'ready', quotes: { [packageId]: validQuote } })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('retries the catalog request when the hook retry action is called', async () => {
    const originalFetch = globalThis.fetch
    const actEnvironment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    const originalActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = true
    const fetcher = jest.fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, taxConfigured: true, packages: [{ id: packageId, quote: validQuote }] }),
      } as Response)
    globalThis.fetch = fetcher

    let currentStatus = 'loading'
    let retry = () => {}
    function Harness() {
      const catalog = usePackageCatalog([packageId])
      currentStatus = catalog.state.status
      retry = catalog.retry
      return null
    }

    const container = document.createElement('div')
    const root = createRoot(container)
    try {
      await act(async () => {
        root.render(createElement(Harness))
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(currentStatus).toBe('error')

      await act(async () => {
        retry()
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      expect(currentStatus).toBe('ready')
      expect(fetcher).toHaveBeenCalledTimes(2)
    } finally {
      await act(async () => root.unmount())
      container.remove()
      globalThis.fetch = originalFetch
      actEnvironment.IS_REACT_ACT_ENVIRONMENT = originalActEnvironment
    }
  })
})