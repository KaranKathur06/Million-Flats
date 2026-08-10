export type ProjectPaymentPlanLike = {
  itemType?: 'BASE_PRICE' | 'FEE' | string | null
  amount?: number | string | null
  currency?: string | null
  label?: string | null
  milestone?: string | null
}

export type ProjectPricingSummaryInput = {
  basePrice?: number | string | null
  paymentPlans?: ProjectPaymentPlanLike[] | null
  additionalCharges?: ProjectPaymentPlanLike[] | null
}

function normalizePaymentPlanType(value?: string | null): 'BASE_PRICE' | 'FEE' | 'UNKNOWN' {
  const normalized = String(value || '').trim().toUpperCase()
  if (!normalized || normalized === 'BASE_PRICE' || normalized === 'SCHEDULE' || normalized === 'SCHEDULE_ITEM') return 'BASE_PRICE'
  if (normalized === 'FEE' || normalized === 'ADDITIONAL_CHARGE' || normalized === 'CHARGE' || normalized === 'SERVICE_FEE' || normalized === 'COST') return 'FEE'
  return 'UNKNOWN'
}

function toFiniteNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function sumAmounts(rows: Array<ProjectPaymentPlanLike | null | undefined> | null | undefined): number {
  if (!rows || rows.length === 0) return 0

  return rows.reduce((total, row) => {
    if (!row) return total
    const amount = toFiniteNumber(row.amount)
    return total + (amount ?? 0)
  }, 0)
}

export function calculateProjectPricingSummary(input: ProjectPricingSummaryInput) {
  const basePrice = toFiniteNumber(input.basePrice) ?? 0
  const normalizedPaymentPlans = Array.isArray(input.paymentPlans) ? input.paymentPlans : []
  const normalizedAdditionalCharges = Array.isArray(input.additionalCharges) ? input.additionalCharges : []

  const paymentScheduleRows = normalizedPaymentPlans.filter((row) => {
    const itemType = normalizePaymentPlanType(row?.itemType)
    return itemType === 'BASE_PRICE' || itemType === 'UNKNOWN' && String(row?.itemType || '').trim() === ''
  })

  const additionalChargeRows = [
    ...normalizedPaymentPlans.filter((row) => normalizePaymentPlanType(row?.itemType) === 'FEE'),
    ...normalizedAdditionalCharges.filter((row) => normalizePaymentPlanType(row?.itemType) === 'FEE' || normalizePaymentPlanType(row?.itemType) === 'UNKNOWN' && !row?.itemType),
  ]

  const paymentScheduleTotal = sumAmounts(paymentScheduleRows)
  const additionalChargesTotal = sumAmounts(additionalChargeRows)
  const totalAcquisitionCost = basePrice + additionalChargesTotal
  const paymentSchedulePercent = basePrice > 0 ? (paymentScheduleTotal / basePrice) * 100 : paymentScheduleTotal > 0 ? 100 : 0

  return {
    basePrice,
    paymentScheduleTotal,
    additionalChargesTotal,
    totalAcquisitionCost,
    paymentSchedulePercent: Number(paymentSchedulePercent.toFixed(2)),
    additionalChargesPercent: basePrice > 0 ? Number(((additionalChargesTotal / basePrice) * 100).toFixed(2)) : 0,
    paymentPlanRows: paymentScheduleRows,
    additionalChargeRows: additionalChargeRows,
    explainer: 'Additional fees are calculated separately from the base-price payment schedule. The payment schedule is a 100% allocation of the property price, not a total acquisition-cost percentage.',
  }
}
