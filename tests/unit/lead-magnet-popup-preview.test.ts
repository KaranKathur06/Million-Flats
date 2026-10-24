import { beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    leadMagnet: { findFirst: jest.fn() },
  },
}))

jest.mock('@/lib/s3', () => ({
  s3ObjectExists: jest.fn(),
}))

jest.mock('@/lib/cloudfront', () => ({
  ASSET_TTL: { PROTECTED_VIEW: 3600 },
  generateSignedUrl: jest.fn(),
}))

jest.mock('@/lib/assetTracking', () => ({
  trackAssetAccess: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { generateSignedUrl } from '@/lib/cloudfront'
import { s3ObjectExists } from '@/lib/s3'
import { getPopupLeadMagnet } from '@/lib/leadMagnets/server'

const activeMagnet = {
  id: 'magnet-1',
  slug: 'investor-guide',
  title: 'Investor Guide',
  subtitle: 'A short description',
  ctaLabel: 'Download',
  loginHint: 'Sign in',
  badgeText: 'Exclusive',
  cooldownHours: 24,
  popupDelaySeconds: 4,
  popupScrollPercent: 25,
  fileS3Key: 'private/lead-magnets/investor-guide/cover.png',
}

describe('lead magnet popup image preview', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma as any).leadMagnet.findFirst.mockResolvedValue(activeMagnet)
    ;(s3ObjectExists as jest.Mock).mockResolvedValue(true)
    ;(generateSignedUrl as jest.Mock).mockResolvedValue({
      url: 'https://cdn.example/preview-signed',
      expiresIn: 3600,
    })
  })

  it('returns a signed image preview without exposing the private S3 key', async () => {
    const result = await getPopupLeadMagnet()

    expect(result?.previewImageUrl).toBe('https://cdn.example/preview-signed')
    expect(result).not.toHaveProperty('fileS3Key')
    expect(generateSignedUrl).toHaveBeenCalledWith({
      s3Key: activeMagnet.fileS3Key,
      ttlSeconds: 3600,
    })
  })

  it('does not sign or return a preview for PDFs', async () => {
    ;(prisma as any).leadMagnet.findFirst.mockResolvedValue({
      ...activeMagnet,
      fileS3Key: 'private/lead-magnets/investor-guide/guide.pdf',
    })

    const result = await getPopupLeadMagnet()

    expect(result?.previewImageUrl).toBeNull()
    expect(s3ObjectExists).not.toHaveBeenCalled()
    expect(generateSignedUrl).not.toHaveBeenCalled()
  })

  it('keeps the text popup available when the image is missing', async () => {
    ;(s3ObjectExists as jest.Mock).mockResolvedValue(false)
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await getPopupLeadMagnet()

    expect(result).toMatchObject({ slug: activeMagnet.slug, previewImageUrl: null })
    expect(generateSignedUrl).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('keeps the text popup available when URL signing fails', async () => {
    ;(generateSignedUrl as jest.Mock).mockRejectedValue(new Error('signing failed'))
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await getPopupLeadMagnet()

    expect(result).toMatchObject({ slug: activeMagnet.slug, previewImageUrl: null })
    error.mockRestore()
  })
})
