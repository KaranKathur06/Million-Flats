import { loadSchemaExpectations } from '@/lib/schemaCompat'

describe('schema compatibility expectations', () => {
  const expectations = loadSchemaExpectations()

  it('maps AI fields to canonical snake_case database columns', () => {
    expect(expectations.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          model: 'Developer',
          field: 'aiScore',
          table: 'developers',
          column: 'ai_score',
        }),
        expect.objectContaining({
          model: 'DeveloperProfile',
          field: 'aiDeveloperScore',
          table: 'developer_profiles',
          column: 'ai_developer_score',
        }),
        expect.objectContaining({
          model: 'AgencyProfile',
          field: 'aiAgencyScore',
          table: 'agency_profiles',
          column: 'ai_agency_score',
        }),
        expect.objectContaining({
          model: 'AgentMetric',
          field: 'aiProScore',
          table: 'agent_metrics',
          column: 'ai_pro_score',
        }),
        expect.objectContaining({
          model: 'AgentSubscription',
          field: 'aiAccessLevel',
          table: 'agent_subscriptions',
          column: 'ai_access_level',
        }),
      ]),
    )
  })

  it('uses developer document compatibility columns from deployed migrations', () => {
    expect(expectations.columns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          model: 'DeveloperDocument',
          field: 'documentType',
          table: 'developer_documents',
          column: 'document_type',
        }),
        expect.objectContaining({
          model: 'DeveloperDocument',
          field: 'verificationStatus',
          table: 'developer_documents',
          column: 'verification_status',
        }),
        expect.objectContaining({
          model: 'DeveloperDocument',
          field: 'uploadedAt',
          table: 'developer_documents',
          column: 'uploaded_at',
        }),
      ]),
    )
  })
})
