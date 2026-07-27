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

    static json(data: unknown, init?: { status?: number }) {
      const body = JSON.stringify(data)
      return new MockResponse(body, init)
    }

    async text() {
      return this.body
    }

    async json() {
      return this.body ? JSON.parse(this.body) : null
    }
  }

  Object.defineProperty(global, 'Response', {
    value: MockResponse,
    writable: true,
    configurable: true,
  })
}

if (typeof global.Request === 'undefined') {
  class MockRequest {
    public url: string
    public method: string
    public headers: Headers
    private body: string

    constructor(input: string | URL | Request, init?: { method?: string; headers?: Record<string, string>; body?: string }) {
      this.url = typeof input === 'string' ? input : input.toString()
      this.method = init?.method ?? 'GET'
      this.headers = new Headers(init?.headers ?? {})
      this.body = init?.body ?? ''
    }

    async json() {
      return this.body ? JSON.parse(this.body) : null
    }

    async text() {
      return this.body
    }
  }

  Object.defineProperty(global, 'Request', {
    value: MockRequest,
    writable: true,
    configurable: true,
  })
}
