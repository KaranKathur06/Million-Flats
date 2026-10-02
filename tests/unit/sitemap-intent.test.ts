jest.mock('@/lib/prisma', () => ({ prisma: {} }))

import { buildIntentSitemapUrls } from '@/lib/sitemap/sitemapService'

describe('intent-specific property sitemaps', () => {
  it('includes only matching public property URLs and preserves the combined compatibility set', () => {
    const saleUrl = '/buy/sea-view-00000000-0000-0000-0000-000000000001'
    const rentUrl = '/rent/city-flat-00000000-0000-0000-0000-000000000002'
    const propertyUrls = [
      { loc: saleUrl, lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8, purpose: 'buy' as const },
      { loc: rentUrl, lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8, purpose: 'rent' as const },
      { loc: saleUrl, lastmod: '2026-10-01', changefreq: 'weekly' as const, priority: 0.8, purpose: 'buy' as const },
    ]

    const sitemaps = buildIntentSitemapUrls(propertyUrls, '2026-10-02')

    expect(sitemaps.buy.map((url) => url.loc)).toEqual(['/buy', saleUrl])
    expect(sitemaps.rent.map((url) => url.loc)).toEqual(['/rent', rentUrl])
    expect(sitemaps.properties.map((url) => url.loc)).toEqual([saleUrl, rentUrl])
  })
})