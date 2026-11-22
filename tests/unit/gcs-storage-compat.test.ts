import { extractRelativeKey, buildAssetUrl } from '@/lib/assetUrl'
import { buildS3Key } from '@/utils/s3PathBuilder'

describe('GCS storage compatibility', () => {
  beforeEach(() => {
    process.env.CDN_BASE_URL = 'https://cdn.millionflats.com'
  })

  it('extracts relative keys from legacy S3 URLs', () => {
    expect(extractRelativeKey(
      'https://millionflats-prod-assets.s3.eu-north-1.amazonaws.com/public/projects/damac/media.JPG'
    )).toBe('public/projects/damac/media.JPG')
  })

  it('extracts relative keys from GCS URLs', () => {
    expect(extractRelativeKey(
      'https://storage.googleapis.com/millionflats-media/public/projects/damac/media.JPG'
    )).toBe('public/projects/damac/media.JPG')
  })

  it('rewrites legacy and relative public assets to CDN URLs', () => {
    expect(buildAssetUrl('public/projects/damac/media.JPG')).toBe(
      'https://cdn.millionflats.com/public/projects/damac/media.JPG'
    )
  })

  it('builds protected object keys with provider-neutral key conventions', () => {
    const key = buildS3Key({
      visibility: 'protected',
      module: 'projects',
      subModule: 'damac/floor-plans',
      fileName: 'floor-plan.pdf',
      includeTimestamp: false,
    })
    expect(key).toMatch(/^protected\/projects\/damac\/floor-plans\/[a-zA-Z0-9-]+-floor-plan\.pdf$/)
  })
})
