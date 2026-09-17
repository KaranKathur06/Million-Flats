import { calculateFinancialModel, normalizePaymentPlan, type PaymentPlan } from '@/lib/paymentPlan'

export type ProjectPaymentPlanLike = {
  itemType?: 'BASE_PRICE' | 'FEE' | string | null
  amount?: number | string | null
  basis?: 'PERCENTAGE' | 'FIXED_AMOUNT' | string | null
  percentage?: number | string | null
  fixedAmount?: number | string | null
  currency?: string | null
  label?: string | null
  milestone?: string | null
  calculatedAmount?: number | string | null
}

export type ProjectPricingSummaryInput = {
  basePrice?: number | string | null
  paymentPlans?: ProjectPaymentPlanLike[] | null
  additionalCharges?: ProjectPaymentPlanLike[] | null
  paymentPlan?: unknown
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
  const structuredPlan = input.paymentPlan && typeof input.paymentPlan === 'object' && !Array.isArray(input.paymentPlan)
    ? normalizePaymentPlan(input.paymentPlan)
    : null
  const financialModel = structuredPlan?.stages.length ? calculateFinancialModel(structuredPlan, basePrice) : null
  const normalizedPaymentPlans = financialModel
    ? financialModel.stageResults.map((stage) => ({
        itemType: 'BASE_PRICE',
        label: stage.label,
        basis: stage.basis,
        percentage: stage.percentage,
        fixedAmount: stage.fixedAmount,
        amount: stage.totalAmount,
        calculatedAmount: stage.totalAmount,
        currency: null,
        milestone: stage.milestone || stage.timingType,
      }))
    : Array.isArray(input.paymentPlans) ? input.paymentPlans : []
  const normalizedAdditionalCharges = financialModel
    ? financialModel.oneTimeCostDetails.map((cost) => ({
        itemType: 'FEE',
        label: cost.label,
        basis: cost.basis,
        amount: cost.calculatedAmount,
        calculatedAmount: cost.calculatedAmount,
        currency: null,
        milestone: cost.timing,
      }))
    : Array.isArray(input.additionalCharges) ? input.additionalCharges : []

  const paymentScheduleRows = normalizedPaymentPlans.filter((row) => {
    const itemType = normalizePaymentPlanType(row?.itemType)
    return itemType === 'BASE_PRICE' || itemType === 'UNKNOWN' && String(row?.itemType || '').trim() === ''
  })

  const additionalChargeRows = [
    ...normalizedPaymentPlans.filter((row) => normalizePaymentPlanType(row?.itemType) === 'FEE'),
    ...normalizedAdditionalCharges.filter((row) => normalizePaymentPlanType(row?.itemType) === 'FEE' || normalizePaymentPlanType(row?.itemType) === 'UNKNOWN' && !row?.itemType),
  ]

  const paymentScheduleTotal = financialModel
    ? financialModel.scheduledPropertyPayments
    : sumAmounts(paymentScheduleRows.map((row) => ({ ...row, amount: row.calculatedAmount ?? row.amount })))
  const additionalChargesTotal = sumAmounts(additionalChargeRows)
  const additionalChargesConfigured = additionalChargeRows.length > 0
  const totalAcquisitionCost = basePrice + additionalChargesTotal
  const paymentSchedulePercent = basePrice > 0 ? (paymentScheduleTotal / basePrice) * 100 : paymentScheduleTotal > 0 ? 100 : 0
  const percentageRows = paymentScheduleRows.filter((row) => String(row?.basis || '').toUpperCase() === 'PERCENTAGE')
  const percentageTotal = percentageRows.reduce((total, row) => total + (toFiniteNumber(row?.percentage) ?? 0), 0)
  const hasPercentageRows = percentageRows.length > 0
  const hasFixedRows = paymentScheduleRows.some((row) => String(row?.basis || '').toUpperCase() === 'FIXED_AMOUNT')
  const mixedMode = hasPercentageRows && hasFixedRows
  const paymentScheduleValid = !mixedMode && (!hasPercentageRows || Math.abs(percentageTotal - 100) < 0.01)

  return {
    basePrice,
    paymentScheduleTotal,
    additionalChargesTotal,
    totalAcquisitionCost,
    paymentSchedulePercent: Number(paymentSchedulePercent.toFixed(2)),
    additionalChargesPercent: basePrice > 0 ? Number(((additionalChargesTotal / basePrice) * 100).toFixed(2)) : 0,
    paymentPlanRows: paymentScheduleRows,
    additionalChargeRows: additionalChargeRows,
    additionalChargesConfigured,
    paymentScheduleValid,
    paymentSchedulePercentageTotal: Number(percentageTotal.toFixed(2)),
    paymentScheduleValidationMessage: mixedMode
      ? 'Percentage and fixed payment stages cannot be mixed.'
      : hasPercentageRows && !paymentScheduleValid
        ? `Payment schedule totals ${Number(percentageTotal.toFixed(2))}%. Expected 100%.`
        : null,
    explainer: 'Additional fees are calculated separately from the base-price payment schedule. The payment schedule is a 100% allocation of the property price, not a total acquisition-cost percentage.',
  }
}
