import { normalizePaymentPlan, parseLegacyPaymentPlanText, paymentPlanValidation } from '@/lib/manualPropertyForm'

describe('manual payment plan', () => {
  it('preserves stage order and validates a complete plan', () => {
    const stages = normalizePaymentPlan([
      { id: 'handover', label: 'Handover', percentage: 50, order: 2 },
      { id: 'booking', label: 'Booking', percentage: 20, order: 0 },
      { id: 'construction', label: 'Construction', percentage: 30, order: 1 },
    ])
    expect(stages.map((stage) => stage.label)).toEqual(['Booking', 'Construction', 'Handover'])
    expect(paymentPlanValidation(stages)).toMatchObject({ totalPercentage: 100, remainingPercentage: 0, state: 'complete', valid: true })
  })

  it('reports partial, overallocated, empty, and invalid plans', () => {
    expect(paymentPlanValidation([]).state).toBe('empty')
    expect(paymentPlanValidation([{ id: 'a', label: 'Booking', percentage: 20, order: 0 }]).state).toBe('incomplete')
    expect(paymentPlanValidation([
      { id: 'a', label: 'Booking', percentage: 60, order: 0 },
      { id: 'b', label: 'Handover', percentage: 60, order: 1 },
    ]).state).toBe('overallocated')
    expect(paymentPlanValidation([{ id: 'a', label: '', percentage: 20, order: 0 }]).state).toBe('invalid')
  })

  it('parses only unambiguous legacy percentage lines', () => {
    expect(parseLegacyPaymentPlanText('20% - Booking\n30% - Construction\n50% - Handover').map((stage) => stage.percentage)).toEqual([20, 30, 50])
    expect(parseLegacyPaymentPlanText('Payment plan available on request')).toEqual([])
  })
})