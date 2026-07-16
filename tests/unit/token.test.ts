import { signToken, verifyToken } from '../../lib/auth/token'

describe('token HMAC helper', () => {
  const originalPeppers = process.env.TOKEN_PEPPERS

  beforeAll(() => {
    // set a deterministic pepper for tests
    process.env.TOKEN_PEPPERS = 'test-pepper'
  })

  afterAll(() => {
    process.env.TOKEN_PEPPERS = originalPeppers
  })

  it('signs and verifies a token', () => {
    const token = 'my-random-token'
    const hash = signToken(token)
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
    expect(verifyToken(token, hash)).toBe(true)
  })

  it('rejects incorrect tokens', () => {
    const token = 'token-a'
    const other = 'token-b'
    const hash = signToken(token)
    expect(verifyToken(other, hash)).toBe(false)
  })
})
