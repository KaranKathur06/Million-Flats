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

export function verifyToken(token: string, expectedHash: string): boolean {
  const peppers = getPeppers()
  if (peppers.length === 0) return false
  for (const p of peppers) {
    const h = crypto.createHmac('sha256', p).update(token).digest('hex')
    if (h === expectedHash) return true
  }
  return false
}
