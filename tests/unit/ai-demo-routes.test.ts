import { describe, expect, it } from '@jest/globals'
import fs from 'node:fs'
import path from 'node:path'

const nextConfig = require('../../next.config')

const demos = [
  { product: 'index', file: 'aiindex_demo.html', page: 'app/ai/index/page.tsx' },
  { product: 'pro', file: 'aipro_demo.html', page: 'app/ai/pro/AIPro.tsx' },
  { product: 'shield', file: 'aishield_demo.html', page: 'components/aishield/AIShieldHero.tsx' },
  { product: 'title', file: 'aititle_demo.html', page: 'app/ai/title/AITitle.tsx' },
  { product: 'view', file: 'aiview_demo.html', page: 'app/ai/view/AIView.tsx' },
]

describe('AI demo preview routes', () => {
  it('rewrites each product preview route to its matching static demo', async () => {
    const rewrites = await nextConfig.rewrites()

    for (const demo of demos) {
      expect(rewrites).toContainEqual({
        source: `/ai/${demo.product}/demo`,
        destination: `/ai-demos/${demo.file}`,
      })
    }
  })

  it('publishes each demo with shared theming, noindex, suite navigation, and a live-product link', () => {
    for (const demo of demos) {
      const html = fs.readFileSync(
        path.join(process.cwd(), 'public', 'ai-demos', demo.file),
        'utf8'
      )

      expect(html).toContain('<meta name="robots" content="noindex,nofollow">')
      expect(html).toContain('href="/ai-demos/theme.css"')
      expect(html).toContain(`href="/ai/${demo.product}/demo"`)
      expect(html).toContain(`href="/ai/${demo.product}"`)
      expect(html).toContain('sample data and is not connected to live AI analysis')
      expect(html).not.toMatch(/href="million_flats_[^"]+\.html"/)
    }
  })

  it('links each live product page to its matching preview', () => {
    for (const demo of demos) {
      const page = fs.readFileSync(path.join(process.cwd(), demo.page), 'utf8')
      expect(page).toContain(`href="/ai/${demo.product}/demo"`)
      expect(page).toContain('View demo preview')
    }
  })
})
