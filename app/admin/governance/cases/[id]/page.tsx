import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'
import CaseDecisionClient from './ui/CaseDecisionClient'
import { prisma } from '@/lib/prisma'

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : ''
}

export default async function GovernanceCasePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)

  if (!session?.user) {
    redirect(`/auth/login?next=${encodeURIComponent(`/admin/governance/cases/${params.id}`)}`)
  }

  if (!hasMinRole(role, 'ADMIN')) {
    redirect(`${getHomeRouteForRole(role)}?error=admin_only`)
  }

  const c = await (prisma as any).moderationCase
    .findUnique({
      where: { id: String(params.id) },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        status: true,
        queue: true,
        currentRiskScore: true,
        currentRiskReasons: true,
        currentRiskEngineVersion: true,
        createdAt: true,
        updatedAt: true,
        actions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            decision: true,
            note: true,
            riskScoreSnapshot: true,
            riskReasonsSnapshot: true,
            riskEngineVersion: true,
            createdAt: true,
            actorUser: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        reports: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { id: true, status: true, reason: true, createdAt: true },
        },
      },
    })
    .catch(() => null)

  if (!c?.id) {
    redirect('/admin/governance')
  }

  const entityType = safeString(c.entityType)
  const entityId = safeString(c.entityId)

  const manualProperty =
    entityType === 'MANUAL_PROPERTY'
      ? await (prisma as any).manualProperty
          .findUnique({
            where: { id: entityId },
            include: {
              media: { orderBy: [{ category: 'asc' }, { position: 'asc' }] },
              agent: { include: { user: true } },
            },
          })
          .catch(() => null)
      : null

  const agent =
    entityType === 'AGENT'
      ? await (prisma as any).agent
          .findUnique({
            where: { id: entityId },
            include: { user: true },
          })
          .catch(() => null)
      : null

  const propertyTitle = safeString(manualProperty?.title) || 'Untitled'
  const propertyCity = safeString(manualProperty?.city)
  const propertyCommunity = safeString(manualProperty?.community)
  const propertyLocation = [propertyCommunity, propertyCity].filter(Boolean).join(', ')
  const propertyCurrency = safeString(manualProperty?.currency) || 'AED'
  const propertyPrice = typeof manualProperty?.price === 'number' && manualProperty.price > 0 ? `${propertyCurrency} ${Math.round(manualProperty.price).toLocaleString()}` : '—'

  const coverUrl = Array.isArray(manualProperty?.media)
    ? safeString(
        manualProperty.media.find((m: any) => safeString(m?.category) === 'COVER')?.url ||
          manualProperty.media.find((m: any) => safeString(m?.url))?.url
      )
    : ''

  const agentUser = manualProperty?.agent?.user
  const agentName = safeString(agentUser?.name) || safeString(agentUser?.email) || 'Agent'
  const agentEmail = safeString(agentUser?.email)
  const agentPhone = safeString(agentUser?.phone)

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="rounded-2xl border border-white/10 bg-[#0f1a2e] p-7">
        <p className="text-amber-300 font-semibold text-sm uppercase tracking-wider">Case</p>
        <h1 className="mt-2 text-3xl font-serif font-bold">{entityType} Review</h1>
        <p className="mt-2 text-white/60 break-all">{entityId}</p>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Status</p>
            <p className="mt-2 text-lg font-bold">{safeString(c.status)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Queue</p>
            <p className="mt-2 text-lg font-bold">{safeString(c.queue)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <p className="text-xs text-white/60">Risk</p>
            <p className="mt-2 text-lg font-bold">{Number(c.currentRiskScore || 0)}</p>
            <p className="text-xs text-white/60">v{safeString(c.currentRiskEngineVersion) || '-'}</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-bold">Decision</h2>
          <div className="mt-3">
            <CaseDecisionClient caseId={String(c.id)} status={String(c.status)} entityType={String(c.entityType)} />
          </div>
        </div>

        {entityType === 'MANUAL_PROPERTY' ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-5">
            <h2 className="text-lg font-bold">Property Snapshot</h2>
            {!manualProperty ? (
              <div className="mt-3 text-white/60">Manual property not found.</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50">Title</div>
                  <div className="mt-1 font-semibold text-white">{propertyTitle}</div>
                  <div className="mt-2 text-xs text-white/50">Location</div>
                  <div className="mt-1 text-white/80">{propertyLocation || '—'}</div>
                  <div className="mt-2 text-xs text-white/50">Price</div>
                  <div className="mt-1 text-white/80">{propertyPrice}</div>
                  <div className="mt-2 text-xs text-white/50">Listing status</div>
                  <div className="mt-1 text-white/80">{safeString(manualProperty?.status) || '—'}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50">Cover</div>
                  <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#0b1220]">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverUrl} alt={propertyTitle} className="w-full h-[220px] object-cover" />
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-white/40 text-sm">No cover image</div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50">Agent</div>
                  <div className="mt-1 font-semibold text-white">{agentName}</div>
                  <div className="mt-2 text-xs text-white/50">Email</div>
                  <div className="mt-1 text-white/80 break-all">{agentEmail || '—'}</div>
                  <div className="mt-2 text-xs text-white/50">Phone</div>
                  <div className="mt-1 text-white/80">{agentPhone || '—'}</div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {entityType === 'AGENT' ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-5">
            <h2 className="text-lg font-bold">Agent Snapshot</h2>
            {!agent ? (
              <div className="mt-3 text-white/60">Agent not found.</div>
            ) : (
              <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50">Agent</div>
                  <div className="mt-1 font-semibold text-white">{safeString(agent?.user?.name) || safeString(agent?.user?.email) || 'Agent'}</div>
                  <div className="mt-2 text-xs text-white/50">Email</div>
                  <div className="mt-1 text-white/80 break-all">{safeString(agent?.user?.email) || '—'}</div>
                  <div className="mt-2 text-xs text-white/50">Role</div>
                  <div className="mt-1 text-white/80">{safeString(agent?.user?.role) || '—'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50">Profile status</div>
                  <div className="mt-1 font-semibold text-white">{safeString(agent?.profileStatus) || '—'}</div>
                  <div className="mt-2 text-xs text-white/50">Verification</div>
                  <div className="mt-1 text-white/80">{safeString(agent?.verificationStatus) || '—'}</div>
                  <div className="mt-2 text-xs text-white/50">Approved</div>
                  <div className="mt-1 text-white/80">{agent?.approved ? 'true' : 'false'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-white/50">Company</div>
                  <div className="mt-1 text-white/80">{safeString(agent?.company) || '—'}</div>
                  <div className="mt-2 text-xs text-white/50">License</div>
                  <div className="mt-1 text-white/80 break-all">{safeString(agent?.license) || '—'}</div>
                  <div className="mt-2 text-xs text-white/50">WhatsApp</div>
                  <div className="mt-1 text-white/80">{safeString(agent?.whatsapp) || '—'}</div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <h3 className="text-sm font-semibold text-white/80">Risk Reasons</h3>
            <pre className="mt-3 text-xs text-white/60 whitespace-pre-wrap break-words">{JSON.stringify(c.currentRiskReasons || null, null, 2)}</pre>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
            <h3 className="text-sm font-semibold text-white/80">Timeline (ModerationAction)</h3>
            <div className="mt-3 space-y-2">
              {(Array.isArray(c.actions) ? c.actions : []).slice(0, 20).map((a: any) => (
                <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{safeString(a.decision)}</div>
                    <div className="text-xs text-white/50">{safeString(a.createdAt) ? new Date(a.createdAt).toLocaleString() : ''}</div>
                  </div>
                  {a.note ? <div className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{String(a.note)}</div> : null}
                  <div className="mt-2 text-xs text-white/50">risk={Number(a.riskScoreSnapshot || 0)} v{safeString(a.riskEngineVersion) || '-'}</div>
                  <div className="mt-2 text-xs text-white/50">actor={safeString(a?.actorUser?.name) || safeString(a?.actorUser?.email) || 'System'}</div>
                </div>
              ))}
              {(Array.isArray(c.actions) ? c.actions.length : 0) === 0 ? <div className="text-white/60">No actions yet.</div> : null}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/10 p-5">
          <h3 className="text-sm font-semibold text-white/80">Reports</h3>
          <div className="mt-3 space-y-2">
            {(Array.isArray(c.reports) ? c.reports : []).slice(0, 20).map((r: any) => (
              <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-white/80">{safeString(r.status)}</div>
                  <div className="text-xs text-white/50">{safeString(r.createdAt) ? new Date(r.createdAt).toLocaleString() : ''}</div>
                </div>
                <div className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{String(r.reason || '')}</div>
              </div>
            ))}
            {(Array.isArray(c.reports) ? c.reports.length : 0) === 0 ? <div className="text-white/60">No reports.</div> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
