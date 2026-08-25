import { calculateFinancialModel, formatFinancialAmount, normalizePaymentPlan } from '@/lib/paymentPlan'

function formatAmount(amount: number | null, currency: string) {
  if (amount === null || !Number.isFinite(amount)) return 'Amount unavailable'
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export function PaymentPlan({ stages, price, currency = 'AED', areaSquareFeet }: { stages: unknown; price?: number | null; currency?: string | null; areaSquareFeet?: number | null }) {
  const safeCurrency = String(currency || '').trim().toUpperCase()
  const plan = normalizePaymentPlan(stages)
  const calculation = calculateFinancialModel(plan, price, areaSquareFeet)
  if (plan.stages.length === 0) return null

  return (
    <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-orange">Payment plan</p>
          <h2 className="mt-2 text-xl md:text-2xl font-serif font-semibold text-dark-blue">How the price is paid</h2>
        </div>
        <p className="text-sm font-semibold text-gray-500">{calculation.allocatedPercentage}% allocated</p>
      </div>
      <div className="mt-5 divide-y divide-gray-100 rounded-2xl border border-gray-200">
        {calculation.stageResults.map((stage) => {
          return (
            <div key={stage.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-base font-semibold text-dark-blue">{stage.label.trim()}</p>
                {stage.description?.trim() ? <p className="mt-1 text-sm text-gray-600">{stage.description.trim()}</p> : null}
              </div>
              <div className="sm:text-right">
                <p className="text-lg font-bold text-dark-blue">{stage.basis === 'PERCENTAGE' ? `${stage.percentage}%` : 'Fixed amount'}</p>
                <p className="text-sm text-gray-600">{formatFinancialAmount(stage.totalAmount, safeCurrency)}</p>
                {stage.installmentAmount ? <p className="text-xs text-gray-500">{formatFinancialAmount(stage.installmentAmount, safeCurrency)} each{stage.installmentCount ? ` x ${stage.installmentCount}` : ''}</p> : null}
              </div>
            </div>
          )
        })}
        <div className="flex items-center justify-between gap-3 bg-gray-50 p-4 text-sm font-semibold text-dark-blue">
          <span>Total property payments</span><span>{formatFinancialAmount(calculation.scheduledPropertyPayments, safeCurrency)}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-2"><p>Additional one-time costs <strong className="float-right text-dark-blue">{formatFinancialAmount(calculation.oneTimeCosts, safeCurrency)}</strong></p><p>Recurring charges <strong className="float-right text-dark-blue">{formatFinancialAmount(calculation.recurringCosts, safeCurrency)}</strong></p><p>Financing <strong className="float-right text-dark-blue">{calculation.estimatedEmi ? `${formatFinancialAmount(calculation.estimatedEmi, safeCurrency)} / month` : 'Not specified'}</strong></p></div>
    </section>
  )
}