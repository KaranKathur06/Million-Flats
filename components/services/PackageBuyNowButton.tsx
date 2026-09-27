'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ShieldCheck, X } from 'lucide-react'

type PackageQuote = {
  pricePaise: number
  taxAmountPaise: number
  totalAmountPaise: number
}

type PackageBuyNowButtonProps = {
  packageId: string
  packageName: string
  audience: string
  quote: PackageQuote | null
  disabledReason?: string
}

type RazorpayInstance = {
  open: () => void
  on: (event: string, handler: (event: any) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, any>) => RazorpayInstance
  }
}

let checkoutScript: Promise<void> | null = null

function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve()
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

function money(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100)
}

export function PackageBuyNowButton({ packageId, packageName, audience, quote, disabledReason }: PackageBuyNowButtonProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [purchaserName, setPurchaserName] = useState(session?.user?.name || '')
  const [purchaserEmail, setPurchaserEmail] = useState(session?.user?.email || '')
  const [status, setStatus] = useState<'idle' | 'creating' | 'checkout' | 'verifying' | 'failed' | 'cancelled' | 'paid'>('idle')
  const [message, setMessage] = useState('')
  const [purchaseId, setPurchaseId] = useState('')
  const idempotencyKey = useRef('')
  const busy = status === 'creating' || status === 'checkout' || status === 'verifying'
  const accountHref = audience === 'DEVELOPERS'
    ? '/developer/auth?tab=register'
    : audience === 'AGENCIES'
      ? '/agency/auth?tab=register'
      : audience === 'AGENTS'
        ? '/agent/auth?tab=register'
        : '/auth/register'

  useEffect(() => {
    if (session?.user?.name && !purchaserName) setPurchaserName(session.user.name)
    if (session?.user?.email && !purchaserEmail) setPurchaserEmail(session.user.email)
  }, [session?.user?.name, session?.user?.email, purchaserName, purchaserEmail])

  const startCheckout = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!quote || busy) return
    setMessage('')
    setStatus('creating')
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()

    try {
      const orderResponse = await fetch('/api/packages/checkout/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId,
          idempotencyKey: idempotencyKey.current,
          purchaserName,
          purchaserEmail,
        }),
      })
      const orderData = await orderResponse.json().catch(() => null)
      if (!orderResponse.ok) throw new Error(orderData?.message || 'Could not start checkout. Please retry.')
      setPurchaserName(orderData.purchaserName || purchaserName)
      setPurchaserEmail(orderData.purchaserEmail || purchaserEmail)
      setPurchaseId(orderData.purchaseId)
      if (orderData.alreadyPaid) {
        setStatus('paid')
        setMessage('Your package purchase is confirmed.')
        return
      }

      await loadCheckoutScript()
      if (!window.Razorpay) throw new Error('Secure checkout could not be loaded. Please try again.')
      setStatus('checkout')

      const checkout = new window.Razorpay({
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'MillionFlats',
        description: packageName,
        order_id: orderData.orderId,
        prefill: { name: purchaserName, email: purchaserEmail },
        notes: { package_purchase_id: orderData.purchaseId },
        theme: { color: '#17365d' },
        handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setStatus('verifying')
          try {
            const verifyResponse = await fetch('/api/packages/checkout/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...payment, purchaseId: orderData.purchaseId }),
            })
            const verifyData = await verifyResponse.json().catch(() => null)
            if (!verifyResponse.ok || !verifyData?.success) throw new Error(verifyData?.message || 'Payment is not confirmed yet. Please retry verification.')
            setStatus('paid')
            setMessage(`Payment confirmed for ${verifyData.purchase.purchaserEmail}.`)
          } catch (error) {
            setStatus('failed')
            setMessage(error instanceof Error ? error.message : 'Payment verification failed. Please retry.')
          }
        },
        modal: {
          ondismiss: () => {
            setStatus('cancelled')
            setMessage('Payment cancelled. You can reopen secure checkout to try again.')
          },
        },
      })
      checkout.on('payment.failed', (failure: any) => {
        setStatus('failed')
        setMessage(failure?.error?.description || 'Payment failed. You can retry without registering.')
      })
      checkout.open()
    } catch (error) {
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Could not start secure checkout.')
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={!quote || Boolean(disabledReason)}
        onClick={() => setIsOpen(true)}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-dark-blue px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#25476f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ShieldCheck size={17} aria-hidden="true" />
        Buy Now Securely
      </button>
      <p className="mt-2 text-center text-xs text-gray-500">Secure payment via Razorpay</p>
      {disabledReason ? <p className="mt-2 text-center text-xs text-amber-700">{disabledReason}</p> : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setIsOpen(false) }}>
          <section role="dialog" aria-modal="true" aria-labelledby={`checkout-${packageId}`} className="w-full max-w-md border border-gray-200 bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Secure checkout</p>
                <h2 id={`checkout-${packageId}`} className="mt-2 text-xl font-bold text-dark-blue">{packageName}</h2>
              </div>
              {!busy ? <button type="button" onClick={() => setIsOpen(false)} aria-label="Close checkout" className="rounded p-1 text-gray-500 hover:bg-gray-100"><X size={18} /></button> : null}
            </div>

            {status === 'paid' ? (
              <div className="mt-6 border-l-2 border-emerald-600 bg-emerald-50 p-4" role="status">
                <p className="font-semibold text-emerald-900">Purchase confirmed</p>
                <p className="mt-1 text-sm text-emerald-800">{message}</p>
                <p className="mt-3 text-xs text-emerald-800">An account is optional. Use this email if you choose to create one and manage the purchase.</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">
                  <Link href={`${accountHref}${accountHref.includes('?') ? '&' : '?'}next=${encodeURIComponent('/packages/claim')}`} className="text-dark-blue underline">Create account</Link>
                  <Link href="/packages/claim" className="text-dark-blue underline">Claim with an existing account</Link>
                </div>
                <button type="button" onClick={() => setIsOpen(false)} className="mt-4 text-sm font-semibold text-dark-blue underline">Close</button>
              </div>
            ) : (
              <>
                <dl className="mt-5 space-y-2 border-y border-gray-200 py-4 text-sm">
                  <div className="flex justify-between gap-4"><dt className="text-gray-600">Plan price</dt><dd className="font-semibold text-gray-900">{quote ? money(quote.pricePaise) : 'Unavailable'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-600">GST</dt><dd className="font-semibold text-gray-900">{quote ? money(quote.taxAmountPaise) : 'Unavailable'}</dd></div>
                  <div className="flex justify-between gap-4 pt-2"><dt className="font-bold text-dark-blue">Total payable</dt><dd className="font-bold text-dark-blue">{quote ? money(quote.totalAmountPaise) : 'Unavailable'}</dd></div>
                </dl>
                <form onSubmit={startCheckout} className="mt-5 space-y-4">
                  <label className="block text-sm font-medium text-gray-700">Name
                    <input required maxLength={120} value={purchaserName} onChange={(event) => setPurchaserName(event.target.value)} autoComplete="name" className="mt-1 h-11 w-full border border-gray-300 px-3 text-sm outline-none focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/15" />
                  </label>
                  <label className="block text-sm font-medium text-gray-700">Email for purchase confirmation
                    <input required type="email" maxLength={254} value={purchaserEmail} onChange={(event) => setPurchaserEmail(event.target.value)} autoComplete="email" className="mt-1 h-11 w-full border border-gray-300 px-3 text-sm outline-none focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/15" />
                  </label>
                  {message ? <p className="text-sm text-red-700" role="alert">{message}</p> : null}
                  <button type="submit" disabled={busy || !quote} className="flex h-12 w-full items-center justify-center rounded-lg bg-dark-blue px-4 text-sm font-semibold text-white hover:bg-[#25476f] disabled:cursor-wait disabled:opacity-60">
                    {status === 'creating' ? 'Preparing secure checkout…' : status === 'verifying' ? 'Verifying payment…' : status === 'checkout' ? 'Checkout is open' : status === 'cancelled' ? 'Try Again' : status === 'failed' ? 'Retry Payment' : 'Continue to Razorpay'}
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}