import { buildFloorPlanStatusCards } from '@/components/admin/projects/ProjectForm/ProjectMediaManager'

describe('buildFloorPlanStatusCards', () => {
  it('matches floor plans to the correct unit type by id instead of bedroom count or label', () => {
    const unitTypes = [
      { id: 'ut-1575', unitType: '2 Bedroom · 1575 sq ft', bedrooms: 2, bathrooms: 2, sortOrder: 1 },
      { id: 'ut-1659', unitType: '2 Bedroom · 1659 sq ft', bedrooms: 2, bathrooms: 2, sortOrder: 2 },
    ]

    const floorPlans = [
      { id: 'fp-1575', unitTypeId: 'ut-1575', unitType: '2 Bedroom · 1575 sq ft', imageUrl: 'https://cdn.example.com/plan-1575.png' },
      { id: 'fp-1659', unitTypeId: 'ut-1659', unitType: '2 Bedroom · 1659 sq ft', imageUrl: 'https://cdn.example.com/plan-1659.png' },
    ]

    const cards = buildFloorPlanStatusCards(unitTypes as any, floorPlans as any)

    expect(cards).toHaveLength(2)
    expect(cards[0].plan?.id).toBe('fp-1575')
    expect(cards[1].plan?.id).toBe('fp-1659')
    expect(cards[0].isUploaded).toBe(true)
    expect(cards[1].isUploaded).toBe(true)
  })

  it('marks unit types without a matching floor plan as missing', () => {
    const unitTypes = [
      { id: 'ut-921', unitType: '1 Bedroom · 921 sq ft', bedrooms: 1, bathrooms: 1, sortOrder: 1 },
      { id: 'ut-1001', unitType: '1 Bedroom · 1001 sq ft', bedrooms: 1, bathrooms: 1, sortOrder: 2 },
    ]

    const floorPlans = [
      { id: 'fp-921', unitTypeId: 'ut-921', unitType: '1 Bedroom · 921 sq ft', imageUrl: 'https://cdn.example.com/plan-921.png' },
    ]

    const cards = buildFloorPlanStatusCards(unitTypes as any, floorPlans as any)

    expect(cards[0].isUploaded).toBe(true)
    expect(cards[1].isUploaded).toBe(false)
    expect(cards[1].plan).toBeNull()
  })
})
