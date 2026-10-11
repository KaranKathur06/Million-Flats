import { afterEach, describe, expect, it } from '@jest/globals'
import { buildSocialMetadata, DEFAULT_SOCIAL_IMAGE, resolveSocialImage } from '@/lib/socialMetadata'

const originalCdnEnvironment = {
  CDN_BASE_URL: process.env.CDN_BASE_URL,
  CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN,
  NEXT_PUBLIC_CDN_DOMAIN: process.env.NEXT_PUBLIC_CDN_DOMAIN,
}

afterEach(() => {
  for (const [key, value] of Object.entries(originalCdnEnvironment)) {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }
})

describe('social metadata image resolution', () => {
  it('uses a root-relative page image before the site fallback', () => {
    expect(resolveSocialImage('/images/projects/hero.jpg')).toBe('/images/projects/hero.jpg')
    expect(resolveSocialImage('/images/projects/hero.jpg?Expires=123&Signature=abc'))
      .toBe(DEFAULT_SOCIAL_IMAGE)
    expect(resolveSocialImage('/protected/projects/hero.jpg')).toBe(DEFAULT_SOCIAL_IMAGE)
    expect(resolveSocialImage('/image-placeholder.svg')).toBe(DEFAULT_SOCIAL_IMAGE)
    expect(resolveSocialImage(null)).toBe(DEFAULT_SOCIAL_IMAGE)
  })

  it('accepts secure public URLs and rejects insecure or signed URLs', () => {
    expect(resolveSocialImage('https://cdn.example.com/projects/hero.jpg'))
      .toBe('https://cdn.example.com/projects/hero.jpg')
    expect(resolveSocialImage('http://cdn.example.com/projects/hero.jpg'))
      .toBe(DEFAULT_SOCIAL_IMAGE)
    expect(resolveSocialImage('https://cdn.example.com/projects/hero.jpg?Expires=123&Signature=abc'))
      .toBe(DEFAULT_SOCIAL_IMAGE)
  })

  it('converts stable asset keys through the configured CDN', () => {
    process.env.CDN_BASE_URL = 'https://cdn.example.com/'

    expect(resolveSocialImage('public/projects/hero.jpg'))
      .toBe('https://cdn.example.com/public/projects/hero.jpg')
  })

  it('uses the same selected image in Open Graph and Twitter metadata', () => {
    const metadata = buildSocialMetadata({
      title: 'Projects | MillionFlats',
      description: 'Discover projects.',
      image: ['https://cdn.example.com/projects/hero.jpg?X-Amz-Signature=abc', '/HOMEPAGE.jpeg'],
    })

    expect(metadata.openGraph?.images).toEqual([{ url: '/HOMEPAGE.jpeg', alt: 'Projects | MillionFlats' }])
    expect(metadata.twitter?.images).toEqual(['/HOMEPAGE.jpeg'])
  })
})
