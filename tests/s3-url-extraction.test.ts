import { describe, expect, it } from '@jest/globals'
import { buildCdnAssetUrl, buildS3ObjectUrl, extractS3KeyFromUrl } from '@/lib/s3'

const originalCdnEnv = {
  CDN_BASE_URL: process.env.CDN_BASE_URL,
  NEXT_PUBLIC_CDN_DOMAIN: process.env.NEXT_PUBLIC_CDN_DOMAIN,
  CLOUDFRONT_DOMAIN: process.env.CLOUDFRONT_DOMAIN,
  CLOUDFRONT_KEY_PAIR_ID: process.env.CLOUDFRONT_KEY_PAIR_ID,
  CLOUDFRONT_PRIVATE_KEY_B64: process.env.CLOUDFRONT_PRIVATE_KEY_B64,
}

function restoreEnv(name: keyof typeof originalCdnEnv) {
  const value = originalCdnEnv[name]
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

beforeAll(() => {
  delete process.env.CLOUDFRONT_DOMAIN
  delete process.env.CLOUDFRONT_KEY_PAIR_ID
  delete process.env.CLOUDFRONT_PRIVATE_KEY_B64
})

afterAll(() => {
  Object.keys(originalCdnEnv).forEach((name) => restoreEnv(name as keyof typeof originalCdnEnv))
})

describe('S3 key extraction', () => {
  it('extracts key from direct S3 URL', () => {
    const url = 'https://my-bucket.s3.us-east-1.amazonaws.com/private/agents/agent-1/documents/PAN/file.pdf'
    expect(extractS3KeyFromUrl(url)).toBe('private/agents/agent-1/documents/PAN/file.pdf')
  })

  it('extracts key from CDN URL', () => {
    process.env.CDN_BASE_URL = 'https://cdn.example.com'
    const url = 'https://cdn.example.com/private/agents/agent-1/documents/PAN/file.pdf'
    expect(extractS3KeyFromUrl(url)).toBe('private/agents/agent-1/documents/PAN/file.pdf')
  })

  it('strips query parameters from signed URLs', () => {
    const url = 'https://my-bucket.s3.us-east-1.amazonaws.com/private/agents/agent-1/documents/PAN/file.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123'
    expect(extractS3KeyFromUrl(url)).toBe('private/agents/agent-1/documents/PAN/file.pdf')
  })

  it('returns null for external URLs', () => {
    expect(extractS3KeyFromUrl('https://example.com/other/path')).toBeNull()
  })
})

describe('CDN URL construction', () => {
  beforeEach(() => {
    delete process.env.CLOUDFRONT_DOMAIN
    delete process.env.CLOUDFRONT_KEY_PAIR_ID
    delete process.env.CLOUDFRONT_PRIVATE_KEY_B64
    delete process.env.NEXT_PUBLIC_CDN_DOMAIN
    process.env.CDN_BASE_URL = 'https://cdn.example.com/'
  })

  it('builds a CDN URL without CloudFront signing configuration', () => {
    expect(buildCdnAssetUrl({ key: '/public/projects/damac/hero.jpg' })).toBe(
      'https://cdn.example.com/public/projects/damac/hero.jpg'
    )
  })

  it('keeps the legacy object URL helper on the configured CDN', () => {
    expect(buildS3ObjectUrl({ key: 'public/projects/damac/hero.jpg' })).toBe(
      'https://cdn.example.com/public/projects/damac/hero.jpg'
    )
  })

  it('fails explicitly when no CDN base is configured', () => {
    delete process.env.CDN_BASE_URL

    expect(() => buildCdnAssetUrl({ key: 'public/projects/damac/hero.jpg' })).toThrow(
      'No CDN base URL configured'
    )
  })
})
