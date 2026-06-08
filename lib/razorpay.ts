/**
 * Razorpay Service Layer
 * Handles order creation, payment verification, and webhook signature validation
 * 
 * Security: No card/bank data is stored. Only Razorpay tokens and signatures.
 */

import crypto from 'crypto'

// Types
export interface RazorpayOrder {
  id: string
  entity: string
  amount: number
  amount_paid: number
  amount_due: number
  currency: string
  receipt: string
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'cancelled' | 'attempted'
  attempts: number
  notes: Record<string, string>
  created_at: number
}

export interface RazorpayPayment {
  id: string
  entity: string
  amount: number
  currency: string
  order_id: string
  status: 'captured' | 'authorized' | 'refunded' | 'failed' | 'created'
  method: string
  amount_refunded: number
  refund_status: string | null
  captured: boolean
  description: string
  card_id: string | null
  bank: string | null
  wallet: string | null
  vpa: string | null
  email: string
  contact: string
  notes: Record<string, string>
  fee: number
  tax: number
  error_code: string | null
  error_description: string | null
  created_at: number
}

export interface CreateOrderOptions {
  amount: number // in paise (INR * 100)
  currency: string
  receipt: string
  notes?: Record<string, string>
}

export interface VerifyPaymentOptions {
  orderId: string
  paymentId: string
  signature: string
}

// Configuration
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID!
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET!
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET!

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1'

/**
 * Get Basic Auth header for Razorpay API
 */
function getAuthHeader(): string {
  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')
  return `Basic ${credentials}`
}

/**
 * Create a Razorpay order
 * @param options Order creation options
 * @returns Razorpay order object
 */
export async function createRazorpayOrder(options: CreateOrderOptions): Promise<RazorpayOrder> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured')
  }

  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: options.amount,
      currency: options.currency || 'INR',
      receipt: options.receipt,
      notes: options.notes || {},
      payment_capture: 1, // Auto-capture payment
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    console.error('Razorpay order creation failed:', error)
    throw new Error(error.error?.description || 'Failed to create Razorpay order')
  }

  return response.json()
}

/**
 * Fetch a Razorpay order by ID
 * @param orderId Razorpay order ID
 * @returns Razorpay order object
 */
export async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured')
  }

  const response = await fetch(`${RAZORPAY_API_BASE}/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.description || 'Failed to fetch Razorpay order')
  }

  return response.json()
}

/**
 * Fetch a Razorpay payment by ID
 * @param paymentId Razorpay payment ID
 * @returns Razorpay payment object
 */
export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured')
  }

  const response = await fetch(`${RAZORPAY_API_BASE}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': getAuthHeader(),
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.description || 'Failed to fetch Razorpay payment')
  }

  return response.json()
}

/**
 * Verify payment signature using HMAC SHA256
 * This is the critical security check to prevent tampering
 * 
 * @param options Payment verification options
 * @returns true if signature is valid
 */
export function verifyPaymentSignature(options: VerifyPaymentOptions): boolean {
  const { orderId, paymentId, signature } = options

  if (!RAZORPAY_KEY_SECRET) {
    console.error('Razorpay key secret not configured')
    return false
  }

  // Create the signature payload: order_id|payment_id
  const payload = `${orderId}|${paymentId}`

  // Generate expected signature using HMAC SHA256
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    // If buffers are different lengths, comparison fails
    return false
  }
}

/**
 * Verify webhook signature using HMAC SHA256
 * 
 * @param body Raw request body as string
 * @param signature X-Razorpay-Signature header value
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error('Razorpay webhook secret not configured')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    return false
  }
}

/**
 * Generate a unique receipt ID for an order
 * Format: MF_{agentId}_{timestamp}_{random}
 */
export function generateReceiptId(agentId: string): string {
  const timestamp = Date.now()
  const random = crypto.randomBytes(4).toString('hex')
  return `MF_${agentId.slice(0, 8)}_${timestamp}_${random}`
}

/**
 * Convert INR to paise (Razorpay uses paise)
 */
export function inrToPaise(inr: number): number {
  return Math.round(inr * 100)
}

/**
 * Convert paise to INR
 */
export function paiseToInr(paise: number): number {
  return paise / 100
}

/**
 * Get Razorpay key ID for frontend checkout
 */
export function getRazorpayKeyId(): string {
  return RAZORPAY_KEY_ID
}

/**
 * Check if Razorpay is configured
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET)
}
