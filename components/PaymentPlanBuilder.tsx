'use client'

import { nanoid } from 'nanoid'
import { normalizePaymentPlan, paymentPlanValidation, type PaymentPlanStage } from '@/lib/manualPropertyForm'

export default function PaymentPlanBuilder({ value, price, currency, onChange }: { value: unknown; price?: number | null; currency?: string | null; onChange: (stages: PaymentPlanStage[]) => void }) {
  const stages = normalizePaymentPlan(value)
  const validation = paymentPlanValidation(stages)
  const update = (index: number, patch: Partial<PaymentPlanStage>) => onChange(stages.map((stage, current) => current === index ? { ...stage, ...patch } : stage))
  const add = () => onChange([...stages, { id: nanoid(8), label: '', percentage: 0, description: '', order: stages.length }])
  const amount = (percentage: number) => typeof price === 'number' && Number.isFinite(price) ? `${String(currency || '').toUpperCase()} ${(price * percentage / 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Add a price to calculate'

  return (
    <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-semibold text-dark-blue">Payment plan</p><p className="mt-1 text-xs text-gray-600">Define when buyers pay the base property price.</p></div>
        <span className={`text-xs font-semibold ${validation.state === 'complete' ? 'text-emerald-700' : validation.state === 'overallocated' || validation.state === 'invalid' ? 'text-red-700' : 'text-amber-700'}`}>{validation.state === 'complete' ? 'Complete' : validation.state === 'empty' ? 'Optional' : validation.message}</span>
      </div>
      <div className="mt-4 space-y-3">
        {stages.map((stage, index) => <div key={stage.id} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_150px]">
            <label className="text-xs font-semibold text-gray-600">Stage / label<input value={stage.label} onChange={(event) => update(index, { label: event.target.value })} className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-dark-blue" placeholder="Booking" /></label>
            <label className="text-xs font-semibold text-gray-600">Percentage<input type="number" min="0" step="0.01" value={stage.percentage || ''} onChange={(event) => update(index, { percentage: Number(event.target.value) || 0 })} className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-dark-blue" /></label>
          </div>
          <label className="mt-3 block text-xs font-semibold text-gray-600">Description / milestone<input value={stage.description || ''} onChange={(event) => update(index, { description: event.target.value })} className="mt-1 h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-dark-blue" placeholder="At booking" /></label>
          <div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-dark-blue">Amount: {amount(stage.percentage)}</p><button type="button" onClick={() => onChange(stages.filter((_, current) => current !== index).map((item, order) => ({ ...item, order })))} className="text-xs font-semibold text-red-700 hover:underline">Remove</button></div>
        </div>)}
      </div>
      <button type="button" onClick={add} className="mt-4 inline-flex h-10 items-center rounded-lg border border-dark-blue px-4 text-sm font-semibold text-dark-blue hover:bg-white">+ Add payment stage</button>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-gray-200 pt-4 text-sm font-semibold text-dark-blue"><span>Total allocated: {validation.totalPercentage}%</span><span className={validation.remainingPercentage < 0 ? 'text-red-700' : 'text-gray-600'}>Remaining: {validation.remainingPercentage}%</span></div>
    </div>
  )
}