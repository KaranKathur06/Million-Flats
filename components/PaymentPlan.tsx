import type { PaymentPlanStage } from '@/lib/manualPropertyForm'

function formatAmount(amount: number | null, currency: string) {
  if (amount === null || !Number.isFinite(amount)) return 'Amount unavailable'
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

export function PaymentPlan({ stages, price, currency = 'AED' }: { stages: PaymentPlanStage[]; price?: number | null; currency?: string | null }) {
  const safeCurrency = String(currency || '').trim().toUpperCase()
  const total = stages.reduce((sum, stage) => sum + stage.percentage, 0)
  if (stages.length === 0) return null

  return (
    <section className="bg-white rounded-3xl p-5 md:p-7 shadow-sm">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-orange">Payment plan</p>
          <h2 className="mt-2 text-xl md:text-2xl font-serif font-semibold text-dark-blue">How the price is paid</h2>
        </div>
        <p className="text-sm font-semibold text-gray-500">{Math.round(total * 100) / 100}% allocated</p>
      </div>
      <div className="mt-5 divide-y divide-gray-100 rounded-2xl border border-gray-200">
        {stages.map((stage) => {
          const amount = typeof price === 'number' && Number.isFinite(price) ? price * stage.percentage / 100 : null
          return (
            <div key={stage.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-base font-semibold text-dark-blue">{stage.label}</p>
                {stage.description ? <p className="mt-1 text-sm text-gray-600">{stage.description}</p> : null}
              </div>
              <div className="sm:text-right">
                <p className="text-lg font-bold text-dark-blue">{stage.percentage}%</p>
                <p className="text-sm text-gray-600">{formatAmount(amount, safeCurrency)}</p>
              </div>
            </div>
          )
        })}
        <div className="flex items-center justify-between gap-3 bg-gray-50 p-4 text-sm font-semibold text-dark-blue">
          <span>Total</span><span>{Math.round(total * 100) / 100}%{typeof price === 'number' && safeCurrency ? ` · ${formatAmount(price, safeCurrency)}` : ''}</span>
        </div>
      </div>
    </section>
  )
}