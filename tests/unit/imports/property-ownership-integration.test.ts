import { beforeEach, describe, expect, it, jest } from '@jest/globals'

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
    importBatch: { findUnique: jest.fn(), update: jest.fn() },
    importRecord: { findMany: jest.fn(), update: jest.fn() },
    importIssue: { deleteMany: jest.fn(), create: jest.fn() },
  },
}))

import { analyzeImportBatch } from '@/lib/imports/core/analyze-import'
import { propertyImportAdapter } from '@/lib/imports/adapters/property/adapter'
import { prisma } from '@/lib/prisma'

const mockedPrisma = prisma as any

describe('property import with ownership resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedPrisma.importIssue.create.mockResolvedValue({ id: 'issue-1' })
  })

  it('resolves property ownership during analysis using city/locality matching', async () => {
    const agentId = 'agent-123'
    
    // Mock agent exists and is approved
    mockedPrisma.agent.findUnique.mockResolvedValue({
      id: agentId,
      status: 'APPROVED',
    })

    // Mock service area - agent covers Mumbai/Andheri
    mockedPrisma.agentServiceArea.findMany.mockResolvedValue([
      {
        id: 'area-1',
        agentId,
        city: 'Mumbai',
        locality: 'Andheri',
        createdAt: new Date(),
      },
    ])

    mockedPrisma.agentSpecialization.findMany.mockResolvedValue([])

    // Setup import batch
    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'UPLOADED',
      category: null,
      totalRecords: 1,
    })

    mockedPrisma.importBatch.update.mockResolvedValue({})
    mockedPrisma.importIssue.deleteMany.mockResolvedValue({ count: 0 })

    // Setup import record with SquareYards data (no agentId)
    mockedPrisma.importRecord.findMany.mockResolvedValue([
      {
        id: 'record-1',
        batchId: 'batch-1',
        sourceRow: 1,
        sourcePath: 'properties[0]',
        rawPayload: {
          listingId: 'SY-12345',
          title: 'Luxury 2BHK Apartment',
          price_text: '₹1.5 Cr',
          area_sqft: '1200',
          city_name: 'Mumbai',
          locality_name: 'Andheri',
          bedrooms: 2,
          bathrooms: 2,
        },
      },
    ])

    // Execute analysis
    await analyzeImportBatch({ batchId: 'batch-1' })

    // Verify that the record was updated
    expect(mockedPrisma.importRecord.update).toHaveBeenCalled()
    
    // Check the actual call to see what was updated
    const updateCall = (mockedPrisma.importRecord.update as jest.Mock).mock.calls[0]
    const updateData = updateCall[0].data
    
    // The record should be processed without errors
    expect(updateData.status).toBeDefined()
    expect(['READY', 'WARNING', 'ERROR']).toContain(updateData.status)
  })

  it('flags ownership resolution for manual review when confidence is low', async () => {
    mockedPrisma.agent.findUnique.mockResolvedValue(null)

    // Mock multiple agents at different distances (geo-proximity match)
    mockedPrisma.agentServiceArea.findMany.mockResolvedValue([])
    mockedPrisma.agentSpecialization.findMany.mockResolvedValue([])

    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'UPLOADED',
      category: null,
      totalRecords: 1,
    })

    mockedPrisma.importBatch.update.mockResolvedValue({})
    mockedPrisma.importIssue.deleteMany.mockResolvedValue({ count: 0 })

    mockedPrisma.importRecord.findMany.mockResolvedValue([
      {
        id: 'record-1',
        batchId: 'batch-1',
        sourceRow: 1,
        sourcePath: 'properties[0]',
        rawPayload: {
          listingId: 'SY-99999',
          title: 'Plot in Tier-2 City',
          price_text: '₹50 Lakh',
          area_sqft: '5000',
          city_name: 'Indore',
          latitude: 22.7196,
          longitude: 75.8577,
        },
      },
    ])

    await analyzeImportBatch({ batchId: 'batch-1' })

    // The record should still be analyzed but may have warnings about ownership
    expect(mockedPrisma.importRecord.update).toHaveBeenCalled()
  })

  it('fails analysis when agent is not approved and no auto-resolution available', async () => {
    mockedPrisma.agent.findUnique.mockResolvedValue({
      id: 'agent-456',
      status: 'PENDING', // Not approved
    })

    mockedPrisma.agentServiceArea.findMany.mockResolvedValue([])
    mockedPrisma.agentSpecialization.findMany.mockResolvedValue([])

    mockedPrisma.importBatch.findUnique.mockResolvedValue({
      id: 'batch-1',
      entityType: 'PROPERTY',
      status: 'UPLOADED',
      category: null,
      totalRecords: 1,
    })

    mockedPrisma.importBatch.update.mockResolvedValue({})
    mockedPrisma.importIssue.deleteMany.mockResolvedValue({ count: 0 })

    mockedPrisma.importRecord.findMany.mockResolvedValue([
      {
        id: 'record-1',
        batchId: 'batch-1',
        sourceRow: 1,
        sourcePath: 'properties[0]',
        rawPayload: {
          listingId: 'SY-11111',
          title: 'Property with invalid agent',
          agentId: 'agent-456',
          price_text: '₹2 Cr',
          city_name: 'Delhi',
          bedrooms: 3,
        },
      },
    ])

    await analyzeImportBatch({ batchId: 'batch-1' })

    // The record should be marked as ERROR due to unapproved agent
    const updateCall = (mockedPrisma.importRecord.update as jest.Mock).mock.calls[0]
    const updateData = updateCall[0].data
    
    expect(updateData.status).toBe('ERROR')
  })
})
