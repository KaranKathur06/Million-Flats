import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Header from '@/components/Header'
import ServicePartnershipsPage from '@/app/services/partnerships/page'
import { ECOSYSTEM_CATEGORIES } from '@/lib/ecosystemPartners'

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}))

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => React.createElement('a', { href }, children),
}))

jest.mock('../../components/responsive', () => ({
  MobileOffCanvasPanel: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => React.createElement('img', props),
}))

describe('partnerships redesign', () => {
  it('removes pricing from the global navigation', () => {
    const html = renderToStaticMarkup(React.createElement(Header))

    expect(html).not.toContain('Pricing')
    expect(html).toContain('Services')
    expect(html).toContain('Agent Portal')
  })

  it('renders the new partnership experience and dynamic categories', () => {
    const html = renderToStaticMarkup(React.createElement(ServicePartnershipsPage))

    expect(html).toContain('Partner with MillionFlats')
    expect(html).toContain('Revenue Sharing Model')
    expect(html).toContain('How Partnership Works')
    expect(html).toContain('How do I receive leads?')
    expect(html).not.toContain('India Licensing')
    expect(html).not.toContain('Free Trial')

    expect(ECOSYSTEM_CATEGORIES).toHaveLength(12)
    expect(ECOSYSTEM_CATEGORIES.some((category) => category.slug === 'technology-partners')).toBe(true)
  })
})
