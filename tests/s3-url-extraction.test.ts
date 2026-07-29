import { describe, expect, it } from '@jest/globals'
import { extractS3KeyFromUrl } from '@/lib/s3'

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

  it('returns null for external URLs', () => {
    expect(extractS3KeyFromUrl('https://example.com/other/path')).toBeNull()
  })
})
