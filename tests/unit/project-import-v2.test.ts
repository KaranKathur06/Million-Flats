import { buildProjectImportPreview, buildCanonicalProjectCreatePayload } from '../../lib/projectImportV2'
import { projectImportAdapter } from '../../lib/imports/adapters/project/adapter'

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

  it('accepts a raw SquareYards-style array of project records and normalizes them', () => {
    const result = buildProjectImportPreview([
      {
        sourceUrl: 'https://www.squareyards.com/arvind-sylva-mullur-bangalore-npd-344456',
        projectId: 344456,
        name: 'Arvind Sylva, Mullur, Bangalore',
        developer: 'Arvind',
        price: 13362500,
        priceCurrency: 'INR',
        priceText: '1.34 Cr to 1.97 Cr',
        priceRangeLow: 13362500,
        priceRangeHigh: 19687500,
        city: 'Bangalore',
        subLocality: 'Mullur',
        locality: 'East Bangalore',
        images: ['https://example.com/image-1.jpg', 'https://example.com/image-2.jpg'],
      },
    ])

    expect(result.ok).toBe(true)
    expect(result.summary.totalProjects).toBe(1)
    expect(result.projects[0].developer).toMatchObject({ name: 'Arvind', slug: 'arvind' })
    expect(result.projects[0].countryIso2).toBe('IN')
    expect(result.projects[0].city).toBe('Bangalore')
    expect(result.projects[0].community).toBe('Mullur')
    expect(result.projects[0].startingPrice).toBe(13362500)
    expect(result.projects[0].sourceMedia?.length).toBeGreaterThan(0)
  })

  it('accepts large batches beyond the old 200-project cap', () => {
    const projects = Array.from({ length: 250 }, (_, idx) => ({
      name: `Project ${idx + 1}`,
      developer: { slug: `dev-${idx + 1}`, name: `Developer ${idx + 1}` },
      countryIso2: 'IN',
      city: 'Bangalore',
      community: 'Whitefield',
      startingPrice: 5000000 + idx,
      sourceMedia: [{ source: 'SQUAREYARDS', sourceUrl: `https://example.com/${idx + 1}.jpg`, category: 'GALLERY', status: 'REVIEW_REQUIRED' }],
    }))

    const result = buildProjectImportPreview({
      schemaVersion: '2.0',
      importType: 'PROJECTS',
      source: { provider: 'SQUAREYARDS', sourceUrl: 'https://example.com', scrapedAt: '2026-08-16T00:00:00.000Z' },
      projects,
    })

    expect(result.ok).toBe(true)
    expect(result.summary.totalProjects).toBe(250)
  })

  it('persists nested unit data when importing a project payload', async () => {
    const db = {
      developer: {
        findUnique: jest.fn().mockResolvedValue({ id: 'dev_123', name: 'Example Developer' }),
        findFirst: jest.fn(),
      },
      project: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'project_123', slug: 'approved-project' }),
        update: jest.fn(),
      },
      projectPaymentPlan: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      projectAmenity: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      projectNearbyPlace: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      projectLocation: { create: jest.fn().mockResolvedValue({ id: 'loc_1' }) },
      projectVideo: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      projectUnitType: { create: jest.fn().mockResolvedValue({ id: 'ut_1' }) },
      projectUnitVariant: { create: jest.fn().mockResolvedValue({ id: 'uv_1' }) },
      projectFloorPlan: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      unitMedia: { deleteMany: jest.fn() },
    }

    const payload = {
      name: 'Approved Project',
      slug: 'approved-project',
      developerId: 'dev_123',
      developerName: 'Example Developer',
      countryIso2: 'IN',
      city: 'Navi Mumbai',
      community: 'Ulwe',
      startingPrice: 9200000,
      unitTypes: [{
        name: '1 BHK',
        bedrooms: 1,
        variants: [{
          title: 'Type A',
          size: 500,
          price: '1.2M',
          floorPlans: [{ title: 'Plan A', imageUrl: 'https://example.com/floorplan.jpg' }],
        }],
      }],
      floorPlans: [{ unitType: '1 BHK', imageUrl: 'https://example.com/project-plan.jpg' }],
      amenities: [{ name: 'Pool', icon: 'pool', category: 'Recreation' }],
    }

    const result = await projectImportAdapter.commit({
      canonical: payload,
      operation: 'CREATE',
      sourceRecordId: 'source-1',
      db,
    })

    expect(result.status).toBe('created')
    expect(db.projectUnitType.create).toHaveBeenCalledTimes(1)
    expect(db.projectUnitVariant.create).toHaveBeenCalledTimes(1)
    expect(db.projectFloorPlan.createMany).toHaveBeenCalledTimes(2)
  })
})
