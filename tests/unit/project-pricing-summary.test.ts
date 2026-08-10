import { describe, expect, it } from '@jest/globals'
import { calculateProjectPricingSummary } from '@/lib/projectPricing'

describe('project pricing summary', () => {
  it('keeps base price payment schedule separate from additional charges', () => {
    const summary = calculateProjectPricingSummary({
      basePrice: 1000000,
      paymentPlans: [
        { itemType: 'BASE_PRICE', label: 'Booking', amount: 100000, currency: 'AED', milestone: 'On Booking' },
        { itemType: 'BASE_PRICE', label: 'Construction', amount: 400000, currency: 'AED', milestone: 'During Construction' },
        { itemType: 'BASE_PRICE', label: 'Handover', amount: 500000, currency: 'AED', milestone: 'On Handover' },
      ],
      additionalCharges: [
        { itemType: 'FEE', label: 'DLD Fee', amount: 40000, currency: 'AED', milestone: null },
      ],
    })

    expect(summary.basePrice).toBe(1000000)
    expect(summary.paymentScheduleTotal).toBe(1000000)
    expect(summary.additionalChargesTotal).toBe(40000)
    expect(summary.totalAcquisitionCost).toBe(1040000)
    expect(summary.paymentSchedulePercent).toBe(100)
    expect(summary.explainer).toContain('Additional fees are calculated separately')
  })

  it('treats the payment schedule as a full property allocation and not as a total cost percentage', () => {
    const summary = calculateProjectPricingSummary({
      basePrice: 1000000,
      paymentPlans: [
        { itemType: 'BASE_PRICE', label: 'Booking', amount: 250000, currency: 'AED', milestone: null },
        { itemType: 'BASE_PRICE', label: 'Handover', amount: 750000, currency: 'AED', milestone: null },
      ],
      additionalCharges: [],
    })

    expect(summary.paymentSchedulePercent).toBe(100)
    expect(summary.totalAcquisitionCost).toBe(1000000)
  })

  it('normalizes legacy fee and schedule item types into the canonical financial model', () => {
    const summary = calculateProjectPricingSummary({
      basePrice: 1200000,
      paymentPlans: [
        { itemType: 'SCHEDULE', label: 'Down Payment', amount: 300000, currency: 'AED', milestone: null },
        { itemType: 'ADDITIONAL_CHARGE', label: 'DLD Fee', amount: 45000, currency: 'AED', milestone: null },
      ],
      additionalCharges: [
        { itemType: 'SERVICE_FEE', label: 'Agency Fee', amount: 15000, currency: 'AED', milestone: null },
      ],
    })

    expect(summary.paymentScheduleTotal).toBe(300000)
    expect(summary.additionalChargesTotal).toBe(60000)
    expect(summary.totalAcquisitionCost).toBe(1260000)
    expect(summary.paymentSchedulePercent).toBe(25)
  })
})
