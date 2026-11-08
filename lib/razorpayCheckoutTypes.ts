export type RazorpayCheckoutPayment = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export type RazorpayCheckoutOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill?: { name?: string; email?: string }
  notes?: Record<string, string>
  theme?: { color: string }
  handler: (response: RazorpayCheckoutPayment) => void | Promise<void>
  modal?: { ondismiss?: () => void }
}

export type RazorpayCheckoutInstance = {
  open: () => void
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance
  }
}
