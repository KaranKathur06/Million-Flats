import { calculateFinancialModel, createPaymentPlan, createPaymentStage, normalizePaymentPlan } from '@/lib/paymentPlan'

describe('canonical payment plan calculator', () => {
  it('allocates percentage stages without double counting booking', () => {
    const plan = createPaymentPlan({ stages: [
      createPaymentStage({ type: 'BOOKING', label: 'Booking', percentage: 20, timingType: 'AT_BOOKING' }),
      createPaymentStage({ type: 'CONSTRUCTION_MILESTONE', label: 'Construction', percentage: 30, timingType: 'AT_CONSTRUCTION_MILESTONE' }),
      createPaymentStage({ type: 'HANDOVER', label: 'Handover', percentage: 50, timingType: 'AT_HANDOVER' }),
    ] })
    const result = calculateFinancialModel(plan, 320000)
    expect(result.scheduledPropertyPayments).toBe(320000)
    expect(result.allocatedPercentage).toBe(100)
    expect(result.remainingAmount).toBe(0)
    expect(result.stageResults.map((stage) => stage.totalAmount)).toEqual([64000, 96000, 160000])
  })

  it('keeps fixed and recurring stages stable when price changes', () => {
    const plan = createPaymentPlan({ stages: [
      createPaymentStage({ basis: 'FIXED_AMOUNT', fixedAmount: 50000, label: 'Booking' }),
      createPaymentStage({ basis: 'PERCENTAGE', percentage: 1, label: 'Post-handover', frequency: 'MONTHLY', installmentCount: 40, type: 'POST_HANDOVER' }),
    ] })
    expect(calculateFinancialModel(plan, 1000000).stageResults.map((stage) => stage.totalAmount)).toEqual([50000, 400000])
    expect(calculateFinancialModel(plan, 2000000).stageResults[0].totalAmount).toBe(50000)
  })

  it('calculates fees, per-area recurring charges, and mortgage EMI separately', () => {
    const plan = createPaymentPlan({
      stages: [createPaymentStage({ percentage: 100, label: 'Purchase', type: 'FINAL_PAYMENT' })],
      additionalCosts: [{ id: 'fee', category: 'REGISTRATION', label: 'Registration', basis: 'PERCENTAGE_OF_PROPERTY_PRICE', percentage: 4, payer: 'BUYER', timing: 'REGISTRATION', recurring: false }],
      recurringCosts: [{ id: 'service', category: 'SERVICE_CHARGE', label: 'Service charge', basis: 'PER_SQ_FT', ratePerSquareFoot: 15, frequency: 'ANNUALLY', status: 'ESTIMATED' }],
      financing: { available: 'YES', source: 'BANK_MORTGAGE', loanAmount: 224000, loanToValue: 70, interestRate: 4.5, termYears: 20, interestType: 'FIXED' },
    })
    const result = calculateFinancialModel(plan, 320000, 2000)
    expect(result.oneTimeCosts).toBe(12800)
    expect(result.recurringCosts).toBe(30000)
    expect(result.estimatedEmi).toBeGreaterThan(0)
    expect(result.scheduledPropertyPayments).toBe(320000)
    expect(result.warnings).not.toContain('Loan amount and loan-to-value do not reconcile.')
  })

  it('normalizes legacy percentage text without discarding unsupported lines', () => {
    const plan = normalizePaymentPlan('20% - Booking\n30% - Construction\n50% - Handover')
    expect(plan.version).toBe(2)
    expect(plan.stages.map((stage) => stage.percentage)).toEqual([20, 30, 50])
  })
})
