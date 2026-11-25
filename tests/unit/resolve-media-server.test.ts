jest.mock('@/lib/cloudfront', () => ({
  generateSignedUrl: jest.fn(),
}))

import { generateSignedUrl } from '@/lib/cloudfront'
import { resolveProjectMediaUrl } from '@/lib/media/resolveMediaServer'

describe('resolveProjectMediaUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.CDN_BASE_URL = 'https://cdn.example.com'
  })

  it('does not sign public project images', async () => {
    await expect(
      resolveProjectMediaUrl('public/projects/damac/hero/image.jpg')
    ).resolves.toBe('https://cdn.example.com/public/projects/damac/hero/image.jpg')
    expect(generateSignedUrl).not.toHaveBeenCalled()
  })

  it('signs protected project documents', async () => {
    ;(generateSignedUrl as jest.Mock).mockResolvedValue({
      url: 'https://signed.example.com/document.pdf',
      expiresAt: new Date(),
      expiresIn: 3600,
      source: 'gcs-presigned',
    })

    await expect(
      resolveProjectMediaUrl('protected/projects/damac/brochures/document.pdf')
    ).resolves.toBe('https://signed.example.com/document.pdf')
    expect(generateSignedUrl).toHaveBeenCalledWith({
      s3Key: 'protected/projects/damac/brochures/document.pdf',
      ttlSeconds: 3600,
    })
  })
})
