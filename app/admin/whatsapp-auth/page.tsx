import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getStats() {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  try {
    const [
      totalSessions24h,
      verifiedSessions24h,
      failedSessions24h,
      newUsers24h,
      totalSessions7d,
      verifiedSessions7d,
      recentSessions,
      recentLogs,
    ] = await Promise.all([
      (prisma as any).whatsAppAuthSession.count({ where: { createdAt: { gte: dayAgo } } }),
      (prisma as any).whatsAppAuthSession.count({ where: { status: 'VERIFIED', createdAt: { gte: dayAgo } } }),
      (prisma as any).whatsAppAuthSession.count({ where: { status: 'FAILED', createdAt: { gte: dayAgo } } }),
      (prisma as any).user.count({ where: { authProvider: 'whatsapp', createdAt: { gte: dayAgo } } }),
      (prisma as any).whatsAppAuthSession.count({ where: { createdAt: { gte: weekAgo } } }),
      (prisma as any).whatsAppAuthSession.count({ where: { status: 'VERIFIED', createdAt: { gte: weekAgo } } }),
      (prisma as any).whatsAppAuthSession.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          sessionId: true,
          phone: true,
          status: true,
          createdAt: true,
          verifiedAt: true,
          ipAddress: true,
        },
      }),
      (prisma as any).whatsAppLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          sessionId: true,
          phone: true,
          logType: true,
          deliveryStatus: true,
          errorCode: true,
          createdAt: true,
        },
      }),
    ])

    const successRate24h = totalSessions24h > 0
      ? Math.round((verifiedSessions24h / totalSessions24h) * 100)
      : 0

    return {
      totalSessions24h,
      verifiedSessions24h,
      failedSessions24h,
      newUsers24h,
      totalSessions7d,
      verifiedSessions7d,
      successRate24h,
      recentSessions,
      recentLogs,
    }
  } catch {
    return null
  }
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return phone
  return phone.slice(0, 4) + '****' + phone.slice(-3)
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    MESSAGE_RECEIVED: 'bg-blue-100 text-blue-800',
    OTP_SENT: 'bg-purple-100 text-purple-800',
    VERIFIED: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-gray-100 text-gray-600',
    FAILED: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default async function WhatsAppAuthAdminPage() {
  const stats = await getStats()

  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold text-white mb-4">WhatsApp Authentication</h1>
        <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
          Unable to load WhatsApp auth stats. The database migration may not have been run yet.
          Run: <code className="bg-black/30 px-2 py-0.5 rounded">npx prisma migrate deploy</code>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#25D366]/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </span>
            WhatsApp Authentication
          </h1>
          <p className="text-sm text-white/50 mt-1">Monitor buyer WhatsApp OTP authentication</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Sessions (24h)', value: stats.totalSessions24h, color: 'text-blue-400' },
          { label: 'Verified (24h)', value: stats.verifiedSessions24h, color: 'text-green-400' },
          { label: 'New Users (24h)', value: stats.newUsers24h, color: 'text-purple-400' },
          { label: 'Success Rate', value: `${stats.successRate24h}%`, color: stats.successRate24h >= 80 ? 'text-green-400' : 'text-yellow-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-white/50 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 7-day summary */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white/80 mb-3">7-Day Summary</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-white/50">Total sessions: </span>
            <span className="text-white font-medium">{stats.totalSessions7d}</span>
          </div>
          <div>
            <span className="text-white/50">Verified: </span>
            <span className="text-green-400 font-medium">{stats.verifiedSessions7d}</span>
          </div>
          <div>
            <span className="text-white/50">Success rate: </span>
            <span className="text-white font-medium">
              {stats.totalSessions7d > 0 ? Math.round((stats.verifiedSessions7d / stats.totalSessions7d) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white/80">Recent Auth Sessions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Session ID</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Phone</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Created</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/30 text-xs">
                    No sessions yet
                  </td>
                </tr>
              ) : (
                stats.recentSessions.map((session: any) => (
                  <tr key={session.sessionId} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-xs text-white/70">{session.sessionId}</td>
                    <td className="px-4 py-2.5 text-white/70">{maskPhone(session.phone)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="px-4 py-2.5 text-white/40 text-xs">
                      {new Date(session.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-white/40 text-xs">{session.ipAddress || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white/80">WhatsApp API Logs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Event</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Phone</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Session</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Error</th>
                <th className="text-left px-4 py-2.5 text-xs text-white/40 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-white/30 text-xs">
                    No logs yet
                  </td>
                </tr>
              ) : (
                stats.recentLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                        log.logType === 'otp_verified' || log.logType === 'login_success'
                          ? 'bg-green-900/40 text-green-400'
                          : log.logType === 'error'
                          ? 'bg-red-900/40 text-red-400'
                          : 'bg-blue-900/40 text-blue-400'
                      }`}>
                        {log.logType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-white/70">{maskPhone(log.phone)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-white/40">{log.sessionId || '—'}</td>
                    <td className="px-4 py-2.5 text-white/50 text-xs">{log.deliveryStatus || '—'}</td>
                    <td className="px-4 py-2.5 text-red-400/70 text-xs">{log.errorCode || '—'}</td>
                    <td className="px-4 py-2.5 text-white/40 text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
