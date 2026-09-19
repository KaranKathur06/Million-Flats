import { buildAnalyticsSummary } from '@/lib/services/analytics/aggregationService'

describe('analytics summary shape', () => {
  it('includes buy and rent property totals alongside the trust metrics', () => {
    const summary = buildAnalyticsSummary({
      monthlyVisitors: 12400,
      realtimeUsers: 45,
      countries: 22,
      cities: 40,
      blogs: 55,
      developers: 110,
      agents: 75,
      saleProperties: 1280,
      rentProperties: 690,
      tours: 42,
      updatedAt: '2024-01-01T00:00:00.000Z',
    })

    expect(summary).toMatchObject({
      monthlyVisitors: 12400,
      buyProperties: 1280,
      rentProperties: 690,
      tours: 42,
    })
  })
})
