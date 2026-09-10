jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(body), {
        ...init,
        headers: { 'Content-Type': 'application/json' },
      }),
  },
}))

jest.mock('@/lib/adminAuth', () => ({
  requireAdminSession: jest.fn(),
}))

jest.mock('@/lib/manualPropertyAdminLifecycle', () => ({
  applyManualPropertyAdminAction: jest.fn(),
}))

import { POST } from '@/app/api/admin/properties/bulk-action/route'
import { requireAdminSession } from '@/lib/adminAuth'
import { applyManualPropertyAdminAction } from '@/lib/manualPropertyAdminLifecycle'

const mockedAuth = requireAdminSession as jest.MockedFunction<typeof requireAdminSession>
const mockedAction = applyManualPropertyAdminAction as jest.MockedFunction<typeof applyManualPropertyAdminAction>

const idOne = '00000000-0000-0000-0000-000000000001'
const idTwo = '00000000-0000-0000-0000-000000000002'

function request(body: unknown) {
  return new Request('http://localhost/api/admin/properties/bulk-action', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('admin property bulk action contract', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedAuth.mockResolvedValue({ ok: true, userId: 'admin-1', role: 'ADMIN' } as any)
    mockedAction.mockResolvedValue({ ok: true, property: { id: idOne } } as any)
  })

  it('deduplicates IDs and maps the public action to the shared lifecycle service', async () => {
    const response = await POST(request({ ids: [idOne, idOne], action: 'PUBLISH' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.successful).toEqual([idOne])
    expect(mockedAction).toHaveBeenCalledWith(expect.objectContaining({ propertyId: idOne, action: 'publish' }))
    expect(mockedAction).toHaveBeenCalledTimes(1)
  })

  it('rejects malformed IDs and unsupported actions before processing', async () => {
    const response = await POST(request({ ids: ['not-an-id'], action: 'PUBLISH' }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.message).toBe('Invalid bulk property action request')
    expect(mockedAction).not.toHaveBeenCalled()
  })

  it('requires an admin role even when a lower moderator session is authenticated', async () => {
    mockedAuth.mockResolvedValue({ ok: true, userId: 'moderator-1', role: 'MODERATOR' } as any)

    const response = await POST(request({ ids: [idOne], action: 'PUBLISH' }))

    expect(response.status).toBe(403)
    expect(mockedAction).not.toHaveBeenCalled()
  })

  it('returns successful and failed records for partial completion', async () => {
    mockedAction
      .mockResolvedValueOnce({ ok: true, property: { id: idOne } } as any)
      .mockResolvedValueOnce({ ok: false, status: 409, message: 'Only published listings can be marked sold.' } as any)

    const response = await POST(request({ ids: [idOne, idTwo], action: 'SOLD' }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.partial).toBe(true)
    expect(json.successful).toEqual([idOne])
    expect(json.failed).toEqual([{ id: idTwo, message: 'Only published listings can be marked sold.' }])
  })
})