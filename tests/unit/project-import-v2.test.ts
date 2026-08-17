import { buildProjectImportPreview, buildCanonicalProjectCreatePayload } from '../../lib/projectImportV2'

describe('project import v2', () => {
  it('accepts a valid V2 envelope with default draft status and false flags', () => {
    const result = buildProjectImportPreview({
      schemaVersion: '2.0',
      importType: 'PROJECTS',
      source: {
        provider: 'SQUAREYARDS',
        sourceUrl: 'https://example.com/project',
        scrapedAt: '2026-08-16T00:00:00.000Z',
      },
      projects: [
        {
          name: 'Example Project',
          developer: { slug: 'example-developer', name: 'Example Developer' },
          countryIso2: 'IN',
          city: 'Navi Mumbai',
          community: 'Ulwe',
          startingPrice: 6500000,
        },
      ],
    })

    expect(result.ok).toBe(true)
    expect(result.summary.validProjects).toBe(1)
    expect(result.projects[0].status).toBe('DRAFT')
    expect(result.projects[0].featured).toBe(false)
    expect(result.projects[0].goldenVisa).toBe(false)
  })

  it('flags missing developer or invalid country for review', () => {
    const result = buildProjectImportPreview({
      schemaVersion: '2.0',
      importType: 'PROJECTS',
      projects: [
        {
          name: 'Bad Project',
          developer: null,
          countryIso2: 'ZZ',
          city: 'Navi Mumbai',
          community: 'Ulwe',
          startingPrice: 6500000,
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.summary.errors).toBeGreaterThan(0)
    expect(result.projects[0].needsReview).toBe(true)
  })

  it('keeps resale listing price out of project startingPrice automatically', () => {
    const result = buildProjectImportPreview({
      schemaVersion: '2.0',
      importType: 'PROJECTS',
      projects: [
        {
          name: 'A K Taj Imperial',
          developer: { slug: 'example-developer', name: 'Example Developer' },
          countryIso2: 'IN',
          city: 'Navi Mumbai',
          community: 'Ulwe',
          startingPrice: 'INR 65 Lac',
          sourceMedia: [{ source: 'SQUAREYARDS', sourceUrl: 'https://img.squareyards.com/example.jpg', category: 'GALLERY', status: 'REVIEW_REQUIRED' }],
        },
      ],
    })

    expect(result.ok).toBe(true)
    expect(result.projects[0].startingPrice).toBe(6500000)
    expect(result.projects[0].sourceMedia?.[0]?.status).toBe('REVIEW_REQUIRED')
  })

  it('creates a canonical create payload for approved project imports', () => {
    const payload = buildCanonicalProjectCreatePayload({
      schemaVersion: '2.0',
      importType: 'PROJECTS',
      source: { provider: 'SQUAREYARDS', sourceUrl: 'https://example.com' },
      projects: [
        {
          name: 'Approved Project',
          developer: { slug: 'example-developer', name: 'Example Developer' },
          countryIso2: 'IN',
          city: 'Navi Mumbai',
          community: 'Ulwe',
          startingPrice: 'INR 92 Lac',
          description: 'A smart city project',
          status: 'DRAFT',
          featured: false,
          goldenVisa: false,
        },
      ],
    })

    expect(payload).toHaveLength(1)
    expect(payload[0]).toMatchObject({
      name: 'Approved Project',
      countryIso2: 'IN',
      city: 'Navi Mumbai',
      community: 'Ulwe',
      status: 'DRAFT',
      goldenVisa: false,
      isFeatured: false,
      developer: { slug: 'example-developer', name: 'Example Developer' },
    })
    expect(payload[0].startingPrice).toBe(9200000)
  })
})
