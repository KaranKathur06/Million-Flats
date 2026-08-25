export type PaymentPlanMode = 'PERCENTAGE' | 'FIXED' | 'MIXED'
export type PaymentBasis = 'PERCENTAGE' | 'FIXED_AMOUNT'
export type PaymentStageType =
  | 'BOOKING'
  | 'INITIAL_PAYMENT'
  | 'MONTHLY_INSTALLMENT'
  | 'QUARTERLY_INSTALLMENT'
  | 'CONSTRUCTION_MILESTONE'
  | 'CUSTOM_MILESTONE'
  | 'HANDOVER'
  | 'POST_HANDOVER'
  | 'FINAL_PAYMENT'
  | 'CUSTOM'
export type PaymentTimingType =
  | 'AT_BOOKING'
  | 'AFTER_DAYS'
  | 'AFTER_MONTHS'
  | 'AFTER_YEARS'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'BIANNUALLY'
  | 'ANNUALLY'
  | 'AT_CONSTRUCTION_MILESTONE'
  | 'AT_HANDOVER'
  | 'AFTER_HANDOVER'
  | 'CUSTOM_DATE'
  | 'CUSTOM_MILESTONE'
export type CostBasis = 'FIXED_AMOUNT' | 'PERCENTAGE_OF_PROPERTY_PRICE' | 'PERCENTAGE_OF_LOAN' | 'RECURRING_AMOUNT'
export type CostPayer = 'BUYER' | 'SELLER' | 'SHARED' | 'UNKNOWN_NEGOTIABLE'
export type CostTiming = 'BOOKING' | 'CONTRACT' | 'REGISTRATION' | 'CONSTRUCTION' | 'HANDOVER' | 'POST_HANDOVER' | 'CUSTOM_DATE'
export type RecurringFrequency = 'MONTHLY' | 'QUARTERLY' | 'BIANNUALLY' | 'ANNUALLY' | 'CUSTOM'
export type FinancingAvailability = 'YES' | 'NO' | 'NOT_SPECIFIED'
export type FinancingSource = 'DEVELOPER_FINANCING' | 'BANK_MORTGAGE' | 'ISLAMIC_FINANCING' | 'CASH' | 'MIXED' | 'NOT_SPECIFIED'

export type PaymentStage = {
  id: string
  type: PaymentStageType
  label: string
  basis: PaymentBasis
  percentage?: number | null
  fixedAmount?: number | null
  timingType: PaymentTimingType
  timingValue?: number | string | null
  frequency?: RecurringFrequency | null
  installmentCount?: number | null
  milestone?: string | null
  description?: string | null
  order: number
}

export type AdditionalCost = {
  id: string
  category: string
  label: string
  basis: CostBasis
  amount?: number | null
  percentage?: number | null
  payer: CostPayer
  timing: CostTiming
  recurring: boolean
  frequency?: RecurringFrequency | null
  installmentCount?: number | null
  description?: string | null
}

export type RecurringCost = {
  id: string
  category: string
  label: string
  basis: 'FIXED_AMOUNT' | 'PER_SQ_FT'
  amount?: number | null
  ratePerSquareFoot?: number | null
  areaSquareFeet?: number | null
  frequency: RecurringFrequency
  status: 'ESTIMATED' | 'CONFIRMED'
  description?: string | null
}

export type Financing = {
  available: FinancingAvailability
  source: FinancingSource
  type?: string | null
  loanAmount?: number | null
  loanToValue?: number | null
  downPayment?: number | null
  interestRate?: number | null
  interestType?: 'FIXED' | 'VARIABLE' | 'NOT_SPECIFIED' | null
  termYears?: number | null
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY' | null
}

export type PaymentPlan = {
  version: 2
  mode: PaymentPlanMode
  stages: PaymentStage[]
  additionalCosts: AdditionalCost[]
  recurringCosts: RecurringCost[]
  financing?: Financing | null
  legacy?: { paymentPlanText?: string | null; bookingAmount?: number | null; maintenanceCharges?: number | null; otherCharges?: number | null; emiNote?: string | null }
}

export type FinancialCalculation = {
  propertyPrice: number
  scheduledPropertyPayments: number
  allocatedAmount: number
  remainingAmount: number
  allocatedPercentage: number
  remainingPercentage: number
  oneTimeCosts: number
  oneTimeCostDetails: Array<AdditionalCost & { calculatedAmount: number }>
  recurringCosts: number
  recurringCostDetails: Array<RecurringCost & { calculatedAmount: number }>
  stageResults: Array<PaymentStage & { calculatedAmount: number; installmentAmount: number | null; totalAmount: number }>
  financingAmount: number
  estimatedDownPayment: number
  estimatedEmi: number | null
  estimatedInterest: number | null
  estimatedTotalRepayment: number | null
  status: 'EMPTY' | 'INCOMPLETE' | 'COMPLETE' | 'OVERALLOCATED' | 'INVALID'
  warnings: string[]
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function positive(value: unknown): number | null {
  const parsed = number(value)
  return parsed !== null && parsed >= 0 ? parsed : null
}

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const legacyTypes: PaymentStageType[] = ['BOOKING', 'CONSTRUCTION_MILESTONE', 'HANDOVER']

export function createPaymentStage(partial: Partial<PaymentStage> = {}, index = 0): PaymentStage {
  return {
    id: text(partial.id, `payment-stage-${index + 1}`),
    type: partial.type || 'CUSTOM',
    label: text(partial.label, 'Payment stage'),
    basis: partial.basis || 'PERCENTAGE',
    percentage: positive(partial.percentage),
    fixedAmount: positive(partial.fixedAmount),
    timingType: partial.timingType || 'CUSTOM_MILESTONE',
    timingValue: partial.timingValue ?? null,
    frequency: partial.frequency ?? null,
    installmentCount: positive(partial.installmentCount),
    milestone: partial.milestone ?? null,
    description: partial.description ?? null,
    order: number(partial.order) ?? index,
  }
}

export function createPaymentPlan(partial: Partial<PaymentPlan> = {}): PaymentPlan {
  return {
    version: 2,
    mode: partial.mode || 'PERCENTAGE',
    stages: Array.isArray(partial.stages) ? partial.stages.map((stage, index) => createPaymentStage(stage, index)).sort((a, b) => a.order - b.order).map((stage, index) => ({ ...stage, order: index })) : [],
    additionalCosts: Array.isArray(partial.additionalCosts) ? partial.additionalCosts as AdditionalCost[] : [],
    recurringCosts: Array.isArray(partial.recurringCosts) ? partial.recurringCosts as RecurringCost[] : [],
    financing: partial.financing || null,
    legacy: partial.legacy || undefined,
  }
}

export function normalizePaymentPlan(raw: unknown, legacyText?: unknown): PaymentPlan {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const value = raw as Record<string, unknown>
    if (value.version === 2 || Array.isArray(value.stages)) {
      return createPaymentPlan(value as Partial<PaymentPlan>)
    }
  }

  const textRows = typeof raw === 'string' ? raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) : []
  const parsedTextRows = textRows.map((line) => {
    const match = line.match(/^(?:(\d+(?:\.\d+)?)%\s*[-: ]\s*(.+)|(.+?)\s*[-: ]\s*(\d+(?:\.\d+)?)%)$/)
    return match ? { percentage: Number(match[1] || match[4]), label: String(match[2] || match[3] || '').trim() } : null
  }).filter((row): row is { percentage: number; label: string } => Boolean(row?.label && row.percentage > 0))
  const rows = Array.isArray(raw) ? raw : parsedTextRows
  const stages = rows.map((item, index) => {
    const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const percentage = positive(value.percentage)
    const fixedAmount = positive(value.fixedAmount)
    return createPaymentStage({
      id: text(value.id, `legacy-payment-stage-${index + 1}`),
      type: legacyTypes[index] || 'CUSTOM',
      label: text(value.label, 'Payment stage'),
      basis: fixedAmount !== null && percentage === null ? 'FIXED_AMOUNT' : 'PERCENTAGE',
      percentage,
      fixedAmount,
      timingType: index === 0 ? 'AT_BOOKING' : index === 2 ? 'AT_HANDOVER' : 'CUSTOM_MILESTONE',
      description: text(value.description) || null,
      order: index,
    }, index)
  })

  return createPaymentPlan({
    mode: stages.some((stage) => stage.basis === 'FIXED_AMOUNT') ? (stages.some((stage) => stage.basis === 'PERCENTAGE') ? 'MIXED' : 'FIXED') : 'PERCENTAGE',
    stages,
    legacy: { paymentPlanText: text(legacyText) || null },
  })
}

function stageAmount(stage: PaymentStage, propertyPrice: number): number {
  const base = stage.basis === 'PERCENTAGE' ? propertyPrice * (positive(stage.percentage) || 0) / 100 : positive(stage.fixedAmount) || 0
  const count = positive(stage.installmentCount)
  const hasRecurringTiming = Boolean(stage.frequency) || ['MONTHLY', 'QUARTERLY', 'BIANNUALLY', 'ANNUALLY', 'AFTER_HANDOVER'].includes(stage.timingType)
  return hasRecurringTiming && count !== null && count > 0 ? base * count : base
}

function calculateEmi(financing: Financing | null | undefined, propertyPrice: number) {
  if (!financing || financing.available !== 'YES') return { loan: 0, downPayment: 0, emi: null, interest: null, repayment: null, warning: null as string | null }
  const ltv = positive(financing.loanToValue)
  const suppliedLoan = positive(financing.loanAmount)
  const suppliedDownPayment = positive(financing.downPayment)
  const loan = suppliedLoan ?? (ltv !== null ? propertyPrice * ltv / 100 : 0)
  const downPayment = suppliedDownPayment ?? Math.max(0, propertyPrice - loan)
  const warnings: string[] = []
  if (loan > propertyPrice) warnings.push('Loan amount cannot exceed the property price.')
  if (ltv !== null && Math.abs(loan - propertyPrice * ltv / 100) > 0.01) warnings.push('Loan amount and loan-to-value do not reconcile.')
  const rate = positive(financing.interestRate)
  const years = positive(financing.termYears)
  if (!loan || rate === null || !years) return { loan, downPayment, emi: null, interest: null, repayment: null, warning: warnings.join(' ') || null }
  const periods = years * 12
  const monthlyRate = rate / 100 / 12
  const emi = monthlyRate === 0 ? loan / periods : loan * monthlyRate * Math.pow(1 + monthlyRate, periods) / (Math.pow(1 + monthlyRate, periods) - 1)
  const repayment = emi * periods
  return { loan, downPayment, emi, interest: repayment - loan, repayment, warning: warnings.join(' ') || null }
}

export function calculateFinancialModel(plan: PaymentPlan | unknown, propertyPrice: unknown, areaSquareFeet?: unknown): FinancialCalculation {
  const normalized = createPaymentPlan(plan as Partial<PaymentPlan>)
  const price = positive(propertyPrice) || 0
  const warnings: string[] = []
  const stageResults = normalized.stages.map((stage) => {
    const calculatedAmount = stageAmount(stage, price)
    const count = positive(stage.installmentCount)
    return { ...stage, calculatedAmount: round(calculatedAmount), installmentAmount: count && count > 0 ? round(calculatedAmount / count) : null, totalAmount: round(calculatedAmount) }
  })
  const scheduled = round(stageResults.reduce((sum, stage) => sum + stage.totalAmount, 0))
  const allocatedPercentage = price > 0 ? round(stageResults.reduce((sum, stage) => sum + (stage.basis === 'PERCENTAGE' ? positive(stage.percentage) || 0 : stage.totalAmount / price * 100), 0)) : 0
  const remainingAmount = round(price - scheduled)
  const remainingPercentage = price > 0 ? round(remainingAmount / price * 100) : 0
  const financing = calculateEmi(normalized.financing, price)

  if (stageResults.some((stage) => !stage.label || stage.totalAmount <= 0)) warnings.push('Every payment stage needs a label and a positive amount.')
  if (scheduled > price + 0.01) warnings.push(`Payment plan exceeds property price by ${round(scheduled - price)}.`)
  if (scheduled < price - 0.01 && stageResults.length > 0) warnings.push(`${round(remainingAmount)} of the property price remains unallocated.`)
  stageResults.forEach((stage) => {
    if (stage.frequency && (!stage.installmentCount || stage.installmentCount <= 0)) warnings.push(`${stage.label} needs an installment count.`)
    if (stage.type === 'POST_HANDOVER' && (!stage.installmentCount || stage.installmentCount <= 0)) warnings.push('Post-handover payments need a duration or installment count.')
    if (stage.installmentAmount !== null && Math.abs(stage.installmentAmount * (stage.installmentCount || 0) - stage.totalAmount) > 0.01) warnings.push(`${stage.label} installment total does not reconcile.`)
  })

  const oneTimeCostDetails = normalized.additionalCosts.filter((cost) => !cost.recurring).map((cost) => {
    const amount = cost.basis === 'PERCENTAGE_OF_PROPERTY_PRICE' ? price * (positive(cost.percentage) || 0) / 100 : cost.basis === 'PERCENTAGE_OF_LOAN' ? financing.loan * (positive(cost.percentage) || 0) / 100 : positive(cost.amount) || 0
    return { ...cost, calculatedAmount: round(amount) }
  })
  const oneTimeCosts = round(oneTimeCostDetails.reduce((sum, cost) => sum + cost.calculatedAmount, 0))
  const area = positive(areaSquareFeet)
  const recurringCostDetails = normalized.recurringCosts.map((cost) => {
    const amount = cost.basis === 'PER_SQ_FT' && area !== null ? (positive(cost.ratePerSquareFoot) || 0) * area : positive(cost.amount) || 0
    return { ...cost, calculatedAmount: round(amount) }
  })
  const recurringCosts = round(recurringCostDetails.reduce((sum, cost) => sum + cost.calculatedAmount, 0))
  if (financing.warning) warnings.push(financing.warning)
  const status = warnings.some((warning) => warning.includes('exceeds') || warning.includes('positive amount')) ? 'OVERALLOCATED' : warnings.length > 0 || (stageResults.length > 0 && scheduled < price - 0.01) ? 'INCOMPLETE' : stageResults.length === 0 ? 'EMPTY' : 'COMPLETE'

  return {
    propertyPrice: price,
    scheduledPropertyPayments: scheduled,
    allocatedAmount: scheduled,
    remainingAmount,
    allocatedPercentage,
    remainingPercentage,
    oneTimeCosts,
    oneTimeCostDetails,
    recurringCosts,
    recurringCostDetails,
    stageResults,
    financingAmount: round(financing.loan),
    estimatedDownPayment: round(financing.downPayment),
    estimatedEmi: financing.emi === null ? null : round(financing.emi),
    estimatedInterest: financing.interest === null ? null : round(financing.interest),
    estimatedTotalRepayment: financing.repayment === null ? null : round(financing.repayment),
    status: warnings.some((warning) => warning.includes('exceeds')) ? 'OVERALLOCATED' : status,
    warnings,
  }
}

export function formatFinancialAmount(amount: number | null | undefined, currency = ''): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return 'Not configured'
  return `${currency ? `${currency.toUpperCase()} ` : ''}${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}
