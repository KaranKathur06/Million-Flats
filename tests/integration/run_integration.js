// Simple integration runner for resend & verify endpoints.
// Usage: set BASE_URL and run `node tests/integration/run_integration.js`

const fetch = global.fetch || require('node-fetch')

const BASE = process.env.BASE_URL || 'http://localhost:3000'

async function main() {
  const testEmail = process.env.TEST_EMAIL
  if (!testEmail) {
    console.error('Please set TEST_EMAIL environment variable for integration test')
    process.exit(2)
  }

  console.log('Requesting resend verification for', testEmail)
  const r = await fetch(`${BASE}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, type: 'user' }),
  })
  console.log('resend status', r.status)
  const data = await r.json().catch(() => ({}))
  console.log('resend body', data)

  console.log('Note: integration test requires manual verification of the email link and DB checks.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
