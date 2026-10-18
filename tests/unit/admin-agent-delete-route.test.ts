jest.mock('@/lib/rbacServer', () => ({ requireRole: jest.fn() }))
jest.mock('@/lib/adminRateLimit', () => ({ checkAdminRateLimit: jest.fn() }))
jest.mock('@/lib/agentAdminLifecycle', () => ({ permanentlyDeleteAgent: jest.fn() }))

import { requireRole } from '@/lib/rbacServer'
import { checkAdminRateLimit } from '@/lib/adminRateLimit'
import { permanentlyDeleteAgent } from '@/lib/agentAdminLifecycle'
import { DELETE } from '@/app/api/admin/agents/[id]/route'

const requireRoleMock = requireRole as jest.Mock
const rateLimitMock = checkAdminRateLimit as jest.Mock
const deleteAgentMock = permanentlyDeleteAgent as jest.Mock

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/agents/agent-1', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('admin agent permanent-delete route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireRoleMock.mockResolvedValue({ ok: true, userId: 'superadmin-1', role: 'SUPERADMIN' })
    rateLimitMock.mockResolvedValue({ ok: true, remaining: 4 })
    deleteAgentMock.mockResolvedValue({ ok: true, agentId: 'agent-1', cleanupJobId: 'cleanup-1' })
  })

  it('requires the exact explicit confirmation before rate limiting or mutation', async () => {
    const response = await DELETE(makeRequest({ confirmation: 'delete' }), { params: { id: 'agent-1' } })

    expect(response.status).toBe(400)
    expect(rateLimitMock).not.toHaveBeenCalled()
    expect(deleteAgentMock).not.toHaveBeenCalled()
  })

  it('fails closed when the destructive-action rate limiter is unavailable', async () => {
    rateLimitMock.mockRejectedValue(new Error('database unavailable'))

    const response = await DELETE(
      makeRequest({ confirmation: 'PERMANENTLY_DELETE_AGENT' }),
      { params: { id: 'agent-1' } },
    )

    expect(response.status).toBe(503)
    expect(deleteAgentMock).not.toHaveBeenCalled()
  })

  it('reports queued cleanup instead of claiming storage deletion completed', async () => {
    const response = await DELETE(
      makeRequest({ confirmation: 'PERMANENTLY_DELETE_AGENT' }),
      { params: { id: 'agent-1' } },
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      cleanup: { status: 'PENDING', jobId: 'cleanup-1' },
    })
    expect(deleteAgentMock).toHaveBeenCalledWith('agent-1', 'superadmin-1')
  })
})
