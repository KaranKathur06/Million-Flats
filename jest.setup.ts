import { TextDecoder, TextEncoder } from 'util'

if (typeof global.TextEncoder === 'undefined') {
  Object.defineProperty(global, 'TextEncoder', {
    value: TextEncoder,
    writable: true,
    configurable: true,
  })
}

if (typeof global.TextDecoder === 'undefined') {
  Object.defineProperty(global, 'TextDecoder', {
    value: TextDecoder,
    writable: true,
    configurable: true,
  })
}

if (typeof global.Response === 'undefined') {
  class MockResponse {
    public status: number
    private body: string

    constructor(body: string | ArrayBuffer | null = '', init?: { status?: number }) {
      this.body = typeof body === 'string' ? body : ''
      this.status = init?.status ?? 200
    }

    async text() {
      return this.body
    }
  }

  Object.defineProperty(global, 'Response', {
    value: MockResponse,
    writable: true,
    configurable: true,
  })
}
