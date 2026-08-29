/**
 * Tests for ownership resolution: mapping imported properties to agents
 */

// Mock prisma client BEFORE importing the module
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agent: {
      findUnique: jest.fn(),
    },
    agentServiceArea: {
      findMany: jest.fn(),
    },
    agentSpecialization: {
      findMany: jest.fn(),
    },
  },
}))

import { resolveOwnership, validateAgentIsApproved } from '@/lib/imports/relations/ownership-resolution'
import { prisma } from '@/lib/prisma'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Ownership Resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Unauthorized Source Provider', () => {
    it('rejects unauthorized sources', async () => {
      const result = await resolveOwnership({
        sourceProvider: 'zillow',
        city: 'Mumbai',
      })

      expect(result.resolved).toBe(false)
      expect(result.requiresManualReview).toBe(true)
      expect(result.warnings[0]).toContain('not authorized')
    })

    it('accepts authorized sources', async () => {
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'ag1',
        status: 'APPROVED',
      } as any)

      const result = await resolveOwnership({
        agentId: 'ag1',
        sourceProvider: 'squareyards',
      })

      expect(result.warnings).not.toContainEqual(expect.stringContaining('not authorized'))
    })
  })

  describe('Strategy 1: Explicit agentId', () => {
    it('resolves with explicit agentId if agent exists and is approved', async () => {
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'ag123',
        status: 'APPROVED',
        approved: true,
      } as any)

      const result = await resolveOwnership({
        agentId: 'ag123',
        sourceProvider: 'squareyards',
      })

      expect(result.resolved).toBe(true)
      expect(result.agentId).toBe('ag123')
      expect(result.confidence).toBe(0.99)
      expect(result.signals[0].type).toBe('explicit_id')
      expect(result.requiresManualReview).toBe(false)
    })

    it('warns if explicit agentId not found', async () => {
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await resolveOwnership({
        agentId: 'ag999',
        sourceProvider: 'squareyards',
      })

      expect(result.warnings).toContainEqual(expect.stringContaining("not found"))
    })

    it('warns if explicit agentId has non-approved status', async () => {
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'ag123',
        status: 'PENDING',
      } as any)

      const result = await resolveOwnership({
        agentId: 'ag123',
        sourceProvider: 'squareyards',
      })

      expect(result.warnings).toContainEqual(expect.stringContaining('not approved'))
      expect(result.resolved).toBe(false)
    })
  })

  describe('Strategy 2: City Matching', () => {
    it('resolves with locality match when available', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag1',
          locality: 'Bandra',
          city: 'Mumbai',
          latitude: 19.06,
          longitude: 72.83,
          agent: { id: 'ag1', status: 'APPROVED' },
        } as any,
        {
          agentId: 'ag2',
          locality: null,
          city: 'Mumbai',
          latitude: null,
          longitude: null,
          agent: { id: 'ag2', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        city: 'Mumbai',
        locality: 'Bandra',
        sourceProvider: 'squareyards',
      })

      expect(result.resolved).toBe(true)
      expect(result.agentId).toBe('ag1')
      expect(result.signals[0].type).toBe('locality_match')
      expect(result.confidence).toBe(0.92)
    })

    it('falls back to city-wide match when locality not found', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag2',
          locality: null,
          city: 'Mumbai',
          agent: { id: 'ag2', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        city: 'Mumbai',
        locality: 'Bandra',
        sourceProvider: 'squareyards',
      })

      expect(result.resolved).toBe(true)
      expect(result.agentId).toBe('ag2')
      expect(result.signals[0].type).toBe('city_match')
      expect(result.confidence).toBe(0.80)
    })

    it('requires manual review if multiple agents in city with no specific locality match', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag1',
          locality: 'Locality A',
          city: 'Mumbai',
          agent: { id: 'ag1', status: 'APPROVED' },
        } as any,
        {
          agentId: 'ag2',
          locality: 'Locality B',
          city: 'Mumbai',
          agent: { id: 'ag2', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        city: 'Mumbai',
        sourceProvider: 'squareyards',
      })

      expect(result.resolved).toBe(false)
      expect(result.requiresManualReview).toBe(true)
      expect(result.signals.length).toBeGreaterThan(1)
    })

    it('warns if no agents found in city', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([])

      const result = await resolveOwnership({
        city: 'NoAgentsHere',
        sourceProvider: 'squareyards',
      })

      expect(result.resolved).toBe(false)
      expect(result.warnings).toContainEqual(expect.stringContaining('No agents found'))
    })

    it('filters for approved agents only', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag1',
          locality: 'Bandra',
          city: 'Mumbai',
          agent: { id: 'ag1', status: 'PENDING' },
        } as any,
        {
          agentId: 'ag2',
          locality: null,
          city: 'Mumbai',
          agent: { id: 'ag2', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        city: 'Mumbai',
        sourceProvider: 'squareyards',
      })

      expect(result.signals[0].agentId).toBe('ag2')
      // The code filters out non-approved agents silently, warnings only appear if we filter them out AFTER finding locality match
      // So this test just verifies ag2 is selected
    })
  })

  describe('Strategy 3: Geo-Proximity Matching', () => {
    it('resolves with nearby agent within 5km', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag1',
          latitude: 19.06,
          longitude: 72.83,
          city: 'Mumbai',
          agent: { id: 'ag1', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        latitude: 19.065,
        longitude: 72.835,
        sourceProvider: 'squareyards',
      })

      expect(result.signals[0].type).toBe('geo_proximity')
      expect(result.signals[0].confidence).toBeGreaterThan(0.9)
    })

    it('uses appropriate confidence based on distance', async () => {
      // Test distance-to-confidence mapping
      // 5km → 0.95, 10km → 0.85, 25km → 0.70, 50km → 0.50

      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag_close',
          latitude: 19.06,
          longitude: 72.83,
          city: 'Mumbai',
          agent: { id: 'ag_close', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        latitude: 19.062, // ~2km away
        longitude: 72.831,
        sourceProvider: 'squareyards',
      })

      const conf = result.signals[0].confidence
      // Should be 0.95 (within 5km)
      expect(conf).toBeGreaterThan(0.9)
    })
  })

  describe('Strategy 4: Agent Specialization Matching', () => {
    it('matches agents by property type specialization', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([])
      (mockPrisma.agentSpecialization.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag1',
          specialization: 'luxury apartments',
          agent: { id: 'ag1', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        propertyType: 'APARTMENT',
        price: 5000000,
        sourceProvider: 'squareyards',
      })

      expect(result.signals.some((s) => s.type === 'agent_specialization')).toBe(true)
      expect(result.signals.some((s) => s.agentId === 'ag1')).toBe(true)
    })
  })

  describe('Resolution Logic', () => {
    it('returns highest confidence signal as primary resolution', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag_city',
          locality: null,
          city: 'Mumbai',
          agent: { id: 'ag_city', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        city: 'Mumbai',
        sourceProvider: 'squareyards',
      })

      expect(result.agentId).toBe('ag_city')
      expect(result.signals[0].type).toBe('city_match')
    })

    it('flags for manual review when multiple candidates with similar confidence', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([
        {
          agentId: 'ag1',
          locality: 'Area1',
          city: 'Mumbai',
          agent: { id: 'ag1', status: 'APPROVED' },
        } as any,
        {
          agentId: 'ag2',
          locality: 'Area2',
          city: 'Mumbai',
          agent: { id: 'ag2', status: 'APPROVED' },
        } as any,
      ])

      const result = await resolveOwnership({
        city: 'Mumbai',
        sourceProvider: 'squareyards',
      })

      expect(result.requiresManualReview).toBe(true)
      // Should have multiple signals and a warning about ambiguity
      expect(result.signals.length).toBeGreaterThan(1)
      expect(result.warnings.some((w) => w.toLowerCase().includes('agent'))).toBe(true)
    })

    it('returns unresolved with requiresManualReview when no signals found', async () => {
      (mockPrisma.agentServiceArea.findMany as jest.Mock).mockResolvedValue([])

      const result = await resolveOwnership({
        sourceProvider: 'squareyards',
      })

      expect(result.resolved).toBe(false)
      expect(result.agentId).toBeNull()
      expect(result.requiresManualReview).toBe(true)
    })
  })

  describe('validateAgentIsApproved', () => {
    it('validates agent is approved', async () => {
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'ag1',
        status: 'APPROVED',
      } as any)

      const result = await validateAgentIsApproved('ag1')

      expect(result.valid).toBe(true)
    })

    it('rejects agent not found', async () => {
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue(null)

      const result = await validateAgentIsApproved('ag999')

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not found')
    })

    it('rejects agent with non-approved status', async () => {
      (mockPrisma.agent.findUnique as jest.Mock).mockResolvedValue({
        id: 'ag1',
        status: 'PENDING',
      } as any)

      const result = await validateAgentIsApproved('ag1')

      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not approved')
    })
  })
})

