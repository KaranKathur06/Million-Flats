import crypto from 'crypto'

// Token signing utility using HMAC with a server-side PEPPER.
// Environment variables:
// - TOKEN_PEPPER: the current pepper (required for signing new tokens)
// - TOKEN_PEPPERS: optional comma-separated list of peppers (first is current) used for verification

function getPeppers(): string[] {
  const list = process.env.TOKEN_PEPPERS || process.env.TOKEN_PEPPER || ''
  return list.split(',').map(s => s.trim()).filter(Boolean)
}

export function signToken(token: string): string {
  const peppers = getPeppers()
  const pepper = peppers[0] || ''
  return crypto.createHmac('sha256', pepper).update(token).digest('hex')
}

/**
 * Constant-time token verification using crypto.timingSafeEqual.
 * Iterates all peppers to support pepper rotation.
 */
export function verifyToken(token: string, expectedHash: string): boolean {
  const peppers = getPeppers()
  if (peppers.length === 0) return false
  const expectedBuf = Buffer.from(expectedHash, 'hex')
  for (const p of peppers) {
    const h = crypto.createHmac('sha256', p).update(token).digest('hex')
    const candidateBuf = Buffer.from(h, 'hex')
    if (candidateBuf.length === expectedBuf.length && crypto.timingSafeEqual(candidateBuf, expectedBuf)) {
      return true
    }
  }
  return false
}

/**
 * Generate a cryptographically secure 6-digit OTP using crypto.randomInt.
 * Never use Math.random() for security-sensitive code generation.
 */
export function generateSecureOtp(length = 6): string {
  const max = Math.pow(10, length)
  const min = Math.pow(10, length - 1)
  return crypto.randomInt(min, max).toString()
}
