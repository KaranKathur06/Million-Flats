import { extractRelativeKey, buildAssetUrl } from '@/lib/assetUrl'
import { buildS3Key } from '@/utils/s3PathBuilder'

describe('GCS storage compatibility', () => {
  const originalGcsBucket = process.env.GCP_STORAGE_BUCKET

  beforeEach(() => {
    process.env.CDN_BASE_URL = 'https://cdn.millionflats.com'
  })

  afterEach(() => {
    if (originalGcsBucket === undefined) delete process.env.GCP_STORAGE_BUCKET
    else process.env.GCP_STORAGE_BUCKET = originalGcsBucket
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

  it('uses direct GCS delivery for public keys when no CDN is configured', () => {
    delete process.env.CDN_BASE_URL
    delete process.env.CLOUDFRONT_DOMAIN
    delete process.env.NEXT_PUBLIC_CDN_DOMAIN
    process.env.GCP_STORAGE_BUCKET = 'millionflats-media'

    expect(buildAssetUrl('public/projects/damac/media.JPG')).toBe(
      'https://storage.googleapis.com/millionflats-media/public/projects/damac/media.JPG'
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
