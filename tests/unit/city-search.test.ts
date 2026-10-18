jest.mock('@/lib/prisma', () => ({
  prisma: {
    city: { findMany: jest.fn() },
    manualProperty: { findMany: jest.fn() },
    project: { findMany: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  buildManualPropertyCityFilter,
  buildProjectCityFilter,
  resolveCitySearchScope,
} from '@/lib/citySearch'

const cityFindMany = prisma.city.findMany as jest.Mock
const propertyFindMany = prisma.manualProperty.findMany as jest.Mock
const projectFindMany = prisma.project.findMany as jest.Mock

describe('city search scope', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    cityFindMany.mockResolvedValue([])
    propertyFindMany.mockResolvedValue([])
    projectFindMany.mockResolvedValue([])
  })

  it('resolves aliases within an explicit country and includes canonical communities', async () => {
    cityFindMany.mockResolvedValue([{
      id: 'city-bengaluru',
      name: 'Bengaluru',
      countryCode: 'INDIA',
      communities: [{ name: 'Whitefield' }],
    }])

    const scope = await resolveCitySearchScope('Bangalore', 'in')

    expect(scope).toMatchObject({
      status: 'resolved',
      name: 'Bengaluru',
      countryCode: 'INDIA',
      countryIso2: 'IN',
      communities: ['Whitefield'],
    })
    expect(cityFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ countryCode: 'INDIA' }),
    }))
  })

  it('matches canonical city and its exact communities without substring filters', async () => {
    cityFindMany.mockResolvedValue([{
      id: 'city-ahmedabad',
      name: 'Ahmedabad',
      countryCode: 'INDIA',
      communities: [{ name: 'Bopal' }],
    }])

    const scope = await resolveCitySearchScope('Ahmedabad', 'IN')
    const propertyFilter = buildManualPropertyCityFilter(scope)
    const projectFilter = buildProjectCityFilter(scope)

    expect(scope.communities).toEqual(expect.arrayContaining(['Bopal', 'Gift City', 'Shilaj']))
    expect(propertyFilter).toEqual(expect.objectContaining({
      countryCode: 'INDIA',
      OR: expect.arrayContaining([
        { city: { equals: 'Ahmedabad', mode: 'insensitive' } },
        { city: { equals: 'Gift City', mode: 'insensitive' } },
        { community: { equals: 'Shilaj', mode: 'insensitive' } },
      ]),
    }))
    expect(projectFilter).toEqual(expect.objectContaining({ countryIso2: 'IN' }))
    expect(JSON.stringify(propertyFilter)).not.toContain('contains')
  })

  it('does not select between canonical cities that remain ambiguous across markets', async () => {
    cityFindMany.mockResolvedValue([
      { id: 'city-one', name: 'Springfield', countryCode: 'INDIA', communities: [] },
      { id: 'city-two', name: 'Springfield', countryCode: 'UAE', communities: [] },
    ])

    const scope = await resolveCitySearchScope('Springfield')

    expect(scope.status).toBe('ambiguous')
    expect(buildProjectCityFilter(scope)).toEqual({ id: { in: [] } })
    expect(propertyFindMany).not.toHaveBeenCalled()
    expect(projectFindMany).not.toHaveBeenCalled()
  })

  it('allows exact legacy city matching without inferring communities', async () => {
    propertyFindMany.mockResolvedValue([{ countryCode: 'INDIA' }])

    const scope = await resolveCitySearchScope('Legacy Town', 'IN')

    expect(scope).toMatchObject({
      status: 'legacy',
      countryCode: 'INDIA',
      countryIso2: 'IN',
      communities: [],
    })
    expect(buildManualPropertyCityFilter(scope)).toMatchObject({
      OR: [
        { city: { equals: 'Legacy Town', mode: 'insensitive' } },
        { city: { equals: 'Legacy-Town', mode: 'insensitive' } },
        { city: { equals: 'Legacy_Town', mode: 'insensitive' } },
      ],
    })
    expect(propertyFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([{ city: { equals: 'Legacy Town', mode: 'insensitive' } }]),
      }),
    }))
  })

  it('returns an empty-results scope for unknown cities and invalid country codes', async () => {
    const unknown = await resolveCitySearchScope('No Such City', 'IN')
    const invalidMarket = await resolveCitySearchScope('Mumbai', 'US')

    expect(unknown.status).toBe('unknown')
    expect(buildManualPropertyCityFilter(unknown)).toEqual({ id: { in: [] } })
    expect(invalidMarket.status).toBe('unknown')
    expect(cityFindMany).toHaveBeenCalledTimes(1)
  })
})
