'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  CreditCard,
  Fingerprint,
  House,
  LockKeyhole,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
} from 'lucide-react'
import {
  PASSPORT_CATEGORIES,
  PASSPORT_CURRENCY,
  PASSPORT_PRICE_INR,
  PASSPORT_PRICE_LABEL,
  getPassportCategoryMeta,
  type PassportCategoryKey,
} from '@/lib/passport'
import { trackEvent } from '@/lib/tracking'
import type { RazorpayCheckoutPayment } from '@/lib/razorpayCheckoutTypes'

type Membership = {
  id: string
  category: string
  membershipNumber: string
  status: string
  issueDate: string
  qrCodeValue: string
  paymentReference?: string | null
}

type Props = {
  userName?: string | null
  userEmail?: string | null
  isAuthenticated: boolean
  initialMembership?: Membership | null
  pendingCategory?: string | null
  dashboard?: boolean
}

let checkoutScript: Promise<void> | null = null

function loadCheckoutScript() {
  if (typeof window.Razorpay === 'function') return Promise.resolve()
  if (!checkoutScript) {
    checkoutScript = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        checkoutScript = null
        reject(new Error('Secure checkout could not be loaded. Please try again.'))
      }
      document.body.appendChild(script)
    })
  }
  return checkoutScript
}

function trackPaymentSuccessOnce(paymentId: string) {
  const key = `millionflats:passport:payment-success:${paymentId}`
  try {
    if (window.localStorage.getItem(key)) return
    window.localStorage.setItem(key, '1')
  } catch {
    // Continue tracking when browser storage is unavailable.
  }
  trackEvent('passport_payment_success', {
    currency: PASSPORT_CURRENCY,
    value: PASSPORT_PRICE_INR,
    product: 'millionflats_passport',
  })
}

const categoryIcons = {
  PROPERTY_BUYERS: House,
  TENANTS_AND_RENTAL_OWNERS: UserRound,
  REAL_ESTATE_AGENTS: Fingerprint,
  REAL_ESTATE_AGENCIES: Building2,
  REAL_ESTATE_DEVELOPERS: Store,
  ECOSYSTEM_PARTNERS: UsersRound,
} satisfies Record<PassportCategoryKey, typeof House>

export default function PassportMembershipPanel({
  userName,
  userEmail,
  isAuthenticated,
  initialMembership,
  pendingCategory,
  dashboard = false,
}: Props) {
  const router = useRouter()
  const checkoutSettling = useRef(false)
  const trackedPageView = useRef(false)
  const [selectedCategory, setSelectedCategory] = useState<PassportCategoryKey | null>(
    pendingCategory && PASSPORT_CATEGORIES.some((item) => item.value === pendingCategory)
      ? pendingCategory as PassportCategoryKey
      : null,
  )
  const [status, setStatus] = useState<'idle' | 'creating' | 'checkout' | 'verifying' | 'failed' | 'cancelled' | 'paid'>('idle')
  const [message, setMessage] = useState('')
  const [verificationPayment, setVerificationPayment] = useState<RazorpayCheckoutPayment | null>(null)
  const [verificationOrderId, setVerificationOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (trackedPageView.current) return
    trackedPageView.current = true
    trackEvent(dashboard ? 'passport_dashboard_view' : 'passport_page_view')
  }, [dashboard])

  const existingCategory = initialMembership
    ? getPassportCategoryMeta(initialMembership.category)
    : null
  const hasPendingCategory = Boolean(
    pendingCategory && PASSPORT_CATEGORIES.some((item) => item.value === pendingCategory),
  )
  const busy = status === 'creating' || status === 'checkout' || status === 'verifying'

  const beginVerification = async (payment: RazorpayCheckoutPayment, passportOrderId: string) => {
    setVerificationPayment(payment)
    setVerificationOrderId(passportOrderId)
    setStatus('verifying')
    setMessage('Confirming your payment securely…')

    try {
      const response = await fetch('/api/passport/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payment, passportOrderId }),
      })
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || 'Payment is not confirmed yet. Please retry verification.')
      }

      trackPaymentSuccessOnce(payment.razorpay_payment_id)
      setVerificationPayment(null)
      setVerificationOrderId(null)
      setStatus('paid')
      setMessage('Payment confirmed. Your digital Passport is ready.')
      router.refresh()
    } catch (error) {
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Payment verification failed. Please retry.')
    }
  }

  const startCheckout = async () => {
    if (!selectedCategory || busy) return

    trackEvent('passport_cta_click', { category: selectedCategory, location: dashboard ? 'dashboard' : 'passport_page' })
    if (!isAuthenticated) {
      router.push('/auth/login?next=%2Fpassport')
      return
    }

    setMessage('')
    setVerificationPayment(null)
    setVerificationOrderId(null)
    setStatus('creating')
    trackEvent('passport_checkout_initiated', {
      category: selectedCategory,
      currency: 'INR',
      value: PASSPORT_PRICE_INR,
    })

    try {
      const orderResponse = await fetch('/api/passport/checkout/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory }),
      })
      const orderData = await orderResponse.json().catch(() => null)
      if (!orderResponse.ok || !orderData?.success) {
        throw new Error(orderData?.message || 'Could not start secure checkout. Please try again.')
      }
      if (!orderData.orderId || !orderData.passportOrderId) {
        throw new Error('Secure checkout did not return a valid order. Please try again.')
      }

      await loadCheckoutScript()
      if (!window.Razorpay) throw new Error('Secure checkout could not be loaded. Please try again.')

      checkoutSettling.current = false
      setStatus('checkout')
      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'MillionFlats',
        description: 'MillionFlats Passport',
        order_id: orderData.orderId,
        prefill: { name: userName || undefined, email: userEmail || undefined },
        notes: { passport_order_id: orderData.passportOrderId },
        theme: { color: '#0d1f38' },
        handler: (payment) => {
          checkoutSettling.current = true
          void beginVerification(payment, orderData.passportOrderId)
        },
        modal: {
          ondismiss: () => {
            if (checkoutSettling.current) return
            setStatus('cancelled')
            setMessage('Checkout was closed. Your selection is saved; you can safely continue later.')
            trackEvent('passport_checkout_cancelled', { category: selectedCategory })
          },
        },
      })
      checkout.on('payment.failed', (failure) => {
        checkoutSettling.current = true
        setStatus('failed')
        setMessage(failure.error?.description || 'Payment was not completed. You can try secure checkout again.')
        trackEvent('passport_payment_failure', {
          category: selectedCategory,
          currency: 'INR',
          value: PASSPORT_PRICE_INR,
        })
      })
      checkout.open()
    } catch (error) {
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Could not start secure checkout.')
      trackEvent('passport_checkout_error', { category: selectedCategory })
    }
  }

  const retryVerification = () => {
    if (!verificationPayment || !verificationOrderId) return
    void beginVerification(verificationPayment, verificationOrderId)
  }

  if (initialMembership && existingCategory) {
    return (
      <section className="mx-auto max-w-5xl">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(13,31,56,0.12)] print:shadow-none">
          <div className="relative overflow-hidden bg-dark-blue px-6 py-8 text-white sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-4 -top-16 h-56 w-56 rounded-full border border-white/10" />
            <div className="relative flex flex-wrap items-start justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">MillionFlats · Digital membership</p>
                <h2 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">Your Passport, ready when you are.</h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                  Your membership details are connected to your MillionFlats account.
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${
                initialMembership.status === 'ACTIVE'
                  ? 'border-emerald-300/40 bg-emerald-300/10 text-emerald-100'
                  : 'border-white/20 bg-white/10 text-white/75'
              }`}>
                {initialMembership.status}
              </span>
            </div>

            <div className="relative mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Member name</p>
                <p className="mt-2 break-words text-base font-semibold">{userName || 'MillionFlats member'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Membership category</p>
                <p className="mt-2 text-base font-semibold">{existingCategory.label}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Membership number</p>
                <p className="mt-2 break-all font-mono text-sm font-semibold tracking-wide">{initialMembership.membershipNumber}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/55">Issued</p>
                <p className="mt-2 text-base font-semibold">
                  {new Date(initialMembership.issueDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Secure membership reference</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-700 sm:text-sm">{initialMembership.qrCodeValue}</p>
              <Link
                href={`/passport/verify/${encodeURIComponent(initialMembership.qrCodeValue)}`}
                className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-dark-blue underline-offset-4 hover:underline print:hidden"
              >
                View verification page <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-dark-blue transition-colors hover:border-dark-blue hover:bg-slate-50 print:hidden"
            >
              <ArrowDownToLine size={16} aria-hidden="true" />
              Print / save as PDF
            </button>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500 print:hidden">
          Passport purchases and category changes are tied to this account. For account help, visit{' '}
          <Link href="/contact" className="font-semibold text-dark-blue underline underline-offset-4">MillionFlats support</Link>.
        </p>
      </section>
    )
  }

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden bg-[#f5f6f7]">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] bg-gradient-to-l from-[#e7edf3] to-transparent lg:block" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-dark-blue">
              <span className="h-px w-8 bg-amber-500" />
              MillionFlats membership
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-dark-blue sm:text-5xl lg:text-[3.55rem]">
              One Passport for your place in the property ecosystem.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Choose the category that fits you. Your digital membership is issued to your MillionFlats account after payment is confirmed.
            </p>
            <div className="mt-7 flex flex-wrap items-end gap-x-5 gap-y-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">One fixed price</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight text-dark-blue sm:text-5xl">{PASSPORT_PRICE_LABEL}</p>
              </div>
              <span className="mb-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600">INR · all categories</span>
            </div>
            <a
              href="#choose-category"
              onClick={() => trackEvent('passport_cta_click', { location: 'hero', target: 'choose_category' })}
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-dark-blue px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#18385e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-blue focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Choose your category <ArrowRight size={17} aria-hidden="true" />
            </a>
            <p className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <LockKeyhole size={14} aria-hidden="true" /> Secure Razorpay checkout · one Passport per account
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[500px]">
            <div className="absolute -inset-5 rounded-[2rem] bg-white/70 blur-2xl" aria-hidden="true" />
            <div className="relative rotate-[1deg] rounded-[1.75rem] border border-white/20 bg-dark-blue p-6 text-white shadow-[0_28px_75px_rgba(13,31,56,0.24)] sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 bg-white/10 text-amber-200">
                    <Fingerprint size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">MillionFlats</p>
                    <p className="mt-0.5 text-sm font-semibold">Digital Passport</p>
                  </div>
                </div>
                <BadgeCheck className="text-amber-200" size={21} aria-hidden="true" />
              </div>
              <div className="mt-10 border-t border-white/15 pt-5">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/55">Membership record</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">Your details. One place.</p>
                <div className="mt-7 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Category</p>
                    <p className="mt-1 text-sm font-medium">Selected at purchase</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/50">Member number</p>
                    <p className="mt-1 font-mono text-sm font-medium">Issued after payment</p>
                  </div>
                </div>
              </div>
              <div className="mt-7 flex items-center justify-between border-t border-white/15 pt-4 text-xs text-white/55">
                <span>ONE ACCOUNT · ONE MEMBERSHIP</span>
                <span className="font-semibold tracking-[0.12em] text-amber-200">{PASSPORT_PRICE_LABEL}</span>
              </div>
            </div>
            <div className="relative mt-4 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck size={14} className="text-emerald-700" aria-hidden="true" />
              A digital membership record, not a physical card
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">A clear membership record</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark-blue sm:text-4xl">What your digital Passport includes</h2>
          <p className="mt-3 text-base leading-7 text-slate-600">
            A straightforward digital record of your MillionFlats membership. No extra tiers or category-based pricing.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { icon: UserRound, number: '01', title: 'Your membership details', text: 'Member name, selected category, issue date, and current status.' },
            { icon: Fingerprint, number: '02', title: 'A unique member number', text: 'A distinct membership number attached to your account.' },
            { icon: ShieldCheck, number: '03', title: 'A secure reference', text: 'A private reference that opens a shareable membership verification page.' },
          ].map(({ icon: Icon, number, title, text }) => (
            <article key={number} className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_36px_rgba(13,31,56,0.08)] motion-reduce:transform-none motion-reduce:transition-none sm:p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-[0.16em] text-slate-400">{number}</span>
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f2f5f8] text-dark-blue transition-colors group-hover:bg-amber-50 group-hover:text-amber-800">
                  <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-dark-blue">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="choose-category" className="scroll-mt-24 bg-[#f5f6f7] py-14 sm:py-18 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_0.82fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Select one membership category</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark-blue sm:text-4xl">Which describes you?</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Every category is the same MillionFlats Passport at the same fixed price. One category can be assigned to each account.
            </p>

            {hasPendingCategory ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="status">
                You have a pending checkout. Continue with {getPassportCategoryMeta(pendingCategory || '')?.label || 'your selected category'} to complete it.
              </div>
            ) : null}

            <fieldset className="mt-6 grid gap-3 sm:grid-cols-2">
              <legend className="sr-only">Passport membership category</legend>
              {PASSPORT_CATEGORIES.map((category) => {
                const Icon = categoryIcons[category.value]
                const isSelected = selectedCategory === category.value
                const isLocked = hasPendingCategory && pendingCategory !== category.value

                return (
                  <label
                    key={category.value}
                    className={`relative flex min-h-[112px] cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 transition duration-150 focus-within:ring-2 focus-within:ring-dark-blue/30 ${
                      isSelected ? 'border-dark-blue ring-1 ring-dark-blue/20 shadow-sm' : 'border-slate-200 hover:border-slate-400'
                    } ${isLocked ? 'cursor-not-allowed opacity-45' : ''}`}
                  >
                    <input
                      type="radio"
                      name="passport-category"
                      value={category.value}
                      checked={isSelected}
                      disabled={isLocked}
                      onChange={() => setSelectedCategory(category.value)}
                      className="sr-only"
                    />
                    <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                      isSelected ? 'bg-dark-blue text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-5 text-slate-900">{category.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{category.description}</span>
                    </span>
                    <span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                      isSelected ? 'border-dark-blue bg-dark-blue text-white' : 'border-slate-300 text-transparent'
                    }`}>
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                  </label>
                )
              })}
            </fieldset>
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_20px_55px_rgba(13,31,56,0.08)] sm:p-8 lg:sticky lg:top-28">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">One Passport · One price</p>
            <h3 className="mt-3 text-xl font-semibold text-dark-blue">MillionFlats Passport</h3>
            <p className="mt-2 text-sm text-slate-600">Single fixed price for every customer and category.</p>
            <div className="mt-6 border-y border-slate-200 py-5">
              <p className="text-4xl font-semibold tracking-tight text-dark-blue">{PASSPORT_PRICE_LABEL}</p>
              <p className="mt-1 text-xs text-slate-500">INR · one-time payment</p>
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <p className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                {selectedCategory ? PASSPORT_CATEGORIES.find((item) => item.value === selectedCategory)?.label : 'Choose one membership category'}
              </p>
              <p className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                Issued digitally after payment confirmation
              </p>
              <p className="flex items-start gap-2.5">
                <Check size={16} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
                Available from your MillionFlats account
              </p>
            </div>

            <button
              type="button"
              onClick={() => void startCheckout()}
              disabled={!selectedCategory || busy || hasPendingCategory && selectedCategory !== pendingCategory}
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-dark-blue px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#18385e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {status === 'creating' ? 'Preparing secure checkout…' :
                status === 'checkout' ? 'Complete payment in checkout…' :
                  status === 'verifying' ? 'Confirming payment…' :
                    isAuthenticated ? 'Continue to secure payment' : 'Sign in to continue'}
              {status !== 'creating' && status !== 'verifying' ? <ArrowRight size={16} aria-hidden="true" /> : null}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <CreditCard size={14} aria-hidden="true" /> Secure payment processed by Razorpay
            </p>

            {message ? (
              <div
                className={`mt-4 rounded-xl border px-3 py-2.5 text-sm ${
                  status === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
                    status === 'cancelled' ? 'border-amber-200 bg-amber-50 text-amber-900' :
                      status === 'failed' ? 'border-red-200 bg-red-50 text-red-800' :
                        'border-slate-200 bg-slate-50 text-slate-700'
                }`}
                role={status === 'verifying' ? 'status' : 'alert'}
              >
                {message}
                {status === 'failed' && verificationPayment ? (
                  <button
                    type="button"
                    onClick={retryVerification}
                    className="mt-2 block font-semibold underline underline-offset-4"
                  >
                    Retry payment verification
                  </button>
                ) : null}
                {status === 'paid' ? (
                  <button
                    type="button"
                    onClick={() => router.refresh()}
                    className="mt-2 block font-semibold underline underline-offset-4"
                  >
                    View your Passport
                  </button>
                ) : null}
              </div>
            ) : null}

            {!isAuthenticated ? (
              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Sign in or create a MillionFlats account first. The membership is issued to that account.
              </p>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-700">Simple by design</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-dark-blue">From selection to digital Passport.</h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              { number: '01', title: 'Choose one category', text: 'Select the membership category that best describes you.' },
              { number: '02', title: 'Pay securely', text: `Complete the one-time ${PASSPORT_PRICE_LABEL} payment through Razorpay.` },
              { number: '03', title: 'View your Passport', text: 'After payment is verified, your digital record appears in your account.' },
            ].map((step) => (
              <li key={step.number} className="border-t-2 border-amber-400 pt-4">
                <span className="text-xs font-bold tracking-[0.16em] text-slate-400">{step.number}</span>
                <h3 className="mt-3 text-base font-semibold text-dark-blue">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-[#f8fafb] p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-start gap-3 text-sm leading-6 text-slate-600">
            <ShieldCheck size={19} className="mt-0.5 shrink-0 text-dark-blue" aria-hidden="true" />
            Your Passport is activated only after the payment provider confirms the payment.
          </p>
          <Link href="/contact" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-dark-blue hover:underline">
            Need help? Contact us <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-[1.75rem] bg-dark-blue px-6 py-8 text-white sm:px-10 sm:py-10 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">Your MillionFlats membership</p>
            <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">One product. One fixed price.</h2>
            <p className="mt-2 text-sm text-white/70">A single digital Passport connected to your account.</p>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-56">
            <p className="text-3xl font-semibold tracking-tight">{PASSPORT_PRICE_LABEL}</p>
            <a
              href="#choose-category"
              onClick={() => trackEvent('passport_cta_click', { location: 'final_cta', target: 'choose_category' })}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-dark-blue transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-dark-blue motion-reduce:transition-none"
            >
              Choose your category <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
