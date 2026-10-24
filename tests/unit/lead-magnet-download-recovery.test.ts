import { describe, expect, it } from '@jest/globals'
import { buildLegacyRecoveryCandidates } from '@/lib/leadMagnets/recovery'
import { getLeadMagnetMimeTypeFromFileName } from '@/lib/leadMagnets/fileTypes'

describe('lead magnet legacy download recovery', () => {
  it('keeps legacy PDF recovery candidates unchanged', () => {
    expect(buildLegacyRecoveryCandidates({
      slug: 'investor-guide',
      key: 'private/lead-magnets/investor-guide/guide-v2.pdf',
    })).toEqual([
      'private/lead-magnets/investor-guide/guide.pdf',
      'private/lead-magnets/faq/investor-guide/guide.pdf',
      'private/lead-magnets/investor-guide/guide-v2.pdf',
      'private/lead-magnets/faq/investor-guide/guide-v2.pdf',
    ])
  })

  it('does not substitute a legacy PDF when an image key is missing', () => {
    const candidates = buildLegacyRecoveryCandidates({
      slug: 'investor-guide',
      key: 'private/lead-magnets/investor-guide/cover.png',
    })

    expect(candidates).toEqual([
      'private/lead-magnets/investor-guide/cover.png',
      'private/lead-magnets/faq/investor-guide/cover.png',
    ])
    expect(candidates).not.toContain('private/lead-magnets/investor-guide/guide.pdf')
  })

  it('does not infer a PDF fallback from an extensionless key', () => {
    const candidates = buildLegacyRecoveryCandidates({
      slug: 'investor-guide',
      key: 'private/lead-magnets/investor-guide/cover',
    })

    expect(candidates).toEqual([
      'private/lead-magnets/investor-guide/cover',
      'private/lead-magnets/faq/investor-guide/cover',
    ])
  })

  it('recognizes only supported image filename extensions for popup previews', () => {
    expect(getLeadMagnetMimeTypeFromFileName('cover.PNG')).toBe('image/png')
    expect(getLeadMagnetMimeTypeFromFileName('cover.jpeg')).toBe('image/jpeg')
    expect(getLeadMagnetMimeTypeFromFileName('cover.webp')).toBe('image/webp')
    expect(getLeadMagnetMimeTypeFromFileName('guide.pdf')).toBe('application/pdf')
    expect(getLeadMagnetMimeTypeFromFileName('cover.svg')).toBeUndefined()
  })
})
