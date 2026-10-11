import { describe, expect, it } from '@jest/globals'
import { buildMissingProjectMetadata, buildProjectMetadata, normalizeProjectDescription } from '@/lib/projectMetadata'

describe('project metadata', () => {
  it('builds consistent title, canonical, and social metadata', () => {
    const metadata = buildProjectMetadata({
      name: 'Nirvana Apartment',
      slug: 'nirvana-apartment',
      city: 'Navi Mumbai',
      description: '<p>Connected homes.</p>',
    })

    expect(metadata.title).toBe('Nirvana Apartment in Navi Mumbai | MillionFlats')
    expect(metadata.alternates?.canonical).toBe('/projects/nirvana-apartment')
    expect(metadata.openGraph).toMatchObject({ title: metadata.title, description: metadata.description, url: metadata.alternates?.canonical })
    expect(metadata.openGraph?.images).toEqual([{
      url: '/meta.jpeg',
      alt: metadata.title,
    }])
    expect(metadata.twitter).toMatchObject({ title: metadata.title, description: metadata.description })
    expect(metadata.twitter?.images).toEqual(['/meta.jpeg'])
  })

  it('uses the project image for both social preview formats', () => {
    const metadata = buildProjectMetadata({
      name: 'Nirvana Apartment',
      slug: 'nirvana-apartment',
      socialImages: [
        'https://cdn.example.com/projects/nirvana/hero.jpg?Expires=123&Signature=abc',
        'https://cdn.example.com/projects/nirvana/cover.jpg',
      ],
    })

    expect(metadata.openGraph?.images).toEqual([{
      url: 'https://cdn.example.com/projects/nirvana/cover.jpg',
      alt: metadata.title,
    }])
    expect(metadata.twitter?.images).toEqual(['https://cdn.example.com/projects/nirvana/cover.jpg'])
  })

  it('omits an unavailable city and falls back to a useful plain-text description', () => {
    const metadata = buildProjectMetadata({ name: 'Nirvana Apartment', slug: 'nirvana-apartment' })

    expect(metadata.title).toBe('Nirvana Apartment | MillionFlats')
    expect(metadata.description).toBe('Explore Nirvana Apartment.')
  })

  it('converts markup to text and caps long descriptions at 160 characters', () => {
    expect(normalizeProjectDescription('<p>A &amp; B</p>', 'Project')).toBe('A & B')

    const normalized = normalizeProjectDescription('x'.repeat(170), 'Project')
    expect(normalized).toBe(`${'x'.repeat(157)}...`)
    expect(Array.from(normalized).length).toBe(160)
  })

  it('marks missing projects as non-indexable without a canonical', () => {
    const metadata = buildMissingProjectMetadata()

    expect(metadata.robots).toEqual({ index: false, follow: true })
    expect(metadata.alternates).toBeUndefined()
    expect(metadata.description).toBe('This project is unavailable.')
  })
})