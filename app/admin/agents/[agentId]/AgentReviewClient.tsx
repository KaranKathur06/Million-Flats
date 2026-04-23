'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/* ─── helpers ─── */
function safeString(v: unknown) {
    return typeof v === 'string' ? v : ''
}

function formatDate(v: unknown) {
    if (!v) return '—'
    try {
        return new Date(v as string).toLocaleString()
    } catch {
        return '—'
    }
}

function getRiskBadge(level: string) {
    switch (level) {
        case 'HIGH':
            return 'border-red-500/30 bg-red-500/10 text-red-300'
        case 'MEDIUM':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        default:
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    }
}

function getStatusBadge(status: string) {
    switch (status.toUpperCase()) {
        case 'APPROVED':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        case 'REJECTED':
            return 'border-red-500/30 bg-red-500/10 text-red-300'
        case 'UNDER_REVIEW':
            return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
        case 'SUBMITTED':
            return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        case 'FLAGGED':
            return 'border-orange-500/30 bg-orange-500/10 text-orange-300'
        case 'PENDING':
        default:
            return 'border-white/10 bg-white/[0.04] text-white/60'
    }
}

function getDocStatusBadge(status: string) {
    switch (status.toUpperCase()) {
        case 'APPROVED':
            return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
        case 'REJECTED':
            return 'border-red-500/30 bg-red-500/10 text-red-300'
        default:
            return 'border-amber-500/30 bg-amber-500/10 text-amber-200'
    }
}

const DOC_TYPE_LABELS: Record<string, string> = {
    PAN: 'PAN Card',
    AADHAR: 'Aadhar Card',
    PASSPORT: 'Passport',
    RERA_CERTIFICATE: 'RERA Certificate',
    BROKER_LICENSE: 'Broker License',
    GST_CERTIFICATE: 'GST Certificate',
    ADDRESS_PROOF: 'Address Proof',
    SELFIE_ID: 'Selfie with ID',
    LICENSE: 'License',
    ID: 'ID Document',
}

/* ─── types ─── */
type AgentDetail = {
    id: string
    userId: string
    company: string | null
    license: string | null
    licenseAuthority: string | null
    yearsExperience: number | null
    primaryMarket: string | null
    specialization: string[]
    linkedinUrl: string | null
    websiteUrl: string | null
    verificationStatus: string
    profileStatus: string
    profileCompletion: number
    bio: string | null
    whatsapp: string | null
    approved: boolean
    riskScore: number
    approvedBy: string | null
    approvedAt: string | null
    rejectionReason: string | null
    createdAt: string
    updatedAt: string
    user: {
        id: string
        email: string
        name: string | null
        phone: string | null
        image: string | null
        role: string
        status: string
        verified: boolean
        emailVerified: boolean
        createdAt: string
    }
    serviceAreas: { id: string; city: string; locality: string | null }[]
    allDocuments: {
        id: string
        type: string
        fileUrl: string
        status: string
        reviewedBy: string | null
        reviewedAt: string | null
        rejectionReason: string | null
        createdAt: string
        source: string
    }[]
    verificationProgress: {
        identityCompleted: boolean
        documentsUploaded: boolean
        businessInfoCompleted: boolean
        profileCompleted: boolean
        completionPercentage: number
    } | null
    riskSignals: { label: string; level: string }[]
    overallRisk: string
    accountAgeDays: number
}

/* ─── main component ─── */
export default function AgentReviewClient({
    agentId,
    currentRole,
}: {
    agentId: string
    currentRole: string
}) {
    const router = useRouter()
    const [agent, setAgent] = useState<AgentDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [actionBusy, setActionBusy] = useState(false)
    const [actionError, setActionError] = useState('')
    const [actionSuccess, setActionSuccess] = useState('')

    // Modal states
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [rejectModalOpen, setRejectModalOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [docRejectId, setDocRejectId] = useState<string | null>(null)
    const [docRejectReason, setDocRejectReason] = useState('')
    const [finalComment, setFinalComment] = useState('')

    const fetchAgent = useCallback(async () => {
        setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/admin/agents/${encodeURIComponent(agentId)}/detail`)
            const data = await res.json()
            if (!res.ok || !data.success) {
                setError(data.message || 'Failed to load agent')
                return
            }
            setAgent(data.agent)
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }, [agentId])

    useEffect(() => {
        fetchAgent()
    }, [fetchAgent])

    const postAction = async (url: string, body?: any) => {
        setActionBusy(true)
        setActionError('')
        setActionSuccess('')
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: body ? { 'content-type': 'application/json' } : undefined,
                body: body ? JSON.stringify(body) : undefined,
            })
            const data = await res.json().catch(() => null)
            if (!res.ok || !data?.success) {
                setActionError(data?.message || 'Action failed')
                return false
            }
            setActionSuccess('Action completed successfully')
            await fetchAgent()
            return true
        } catch {
            setActionError('Network error')
            return false
        } finally {
            setActionBusy(false)
        }
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-[1200px] py-20 text-center">
                <div className="inline-flex h-10 w-10 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
                <p className="mt-4 text-sm text-white/40">Loading agent details…</p>
            </div>
        )
    }

    if (error || !agent) {
        return (
            <div className="mx-auto max-w-[1200px] py-20 text-center">
                <p className="text-red-300 font-semibold">{error || 'Agent not found'}</p>
                <Link href="/admin/agents" className="mt-4 inline-flex text-sm text-amber-400 hover:text-amber-300">
                    ← Back to queue
                </Link>
            </div>
        )
    }

    const vs = agent.verificationStatus.toUpperCase()
    const allDocsApproved = agent.allDocuments.length > 0 && agent.allDocuments.every((d) => d.status.toUpperCase() === 'APPROVED')
    const canFinalApprove = (vs === 'UNDER_REVIEW' || vs === 'SUBMITTED') && allDocsApproved

    return (
        <div className="mx-auto max-w-[1200px] space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <Link href="/admin/agents" className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/40 hover:text-white/70 transition-colors mb-3">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Back to Queue
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">Agent Review</h1>
                    <p className="mt-1 text-sm text-white/40">{agent.user.email}</p>
                </div>
                <span className={`rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${getStatusBadge(vs)}`}>
                    {vs.replace('_', ' ')}
                </span>
            </div>

            {/* Action feedback */}
            {actionError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-300">
                    {actionError}
                </div>
            )}
            {actionSuccess && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm font-semibold text-emerald-300">
                    {actionSuccess}
                </div>
            )}

            {/* ─── Section 1: Agent Summary ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 text-xs font-black">1</span>
                    Agent Summary
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Name</div>
                        <div className="text-white font-semibold">{agent.user.name || '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Email</div>
                        <div className="text-white/80 break-all">{agent.user.email}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Phone</div>
                        <div className="text-white/80">{agent.user.phone || '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Company</div>
                        <div className="text-white/80">{agent.company || '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">RERA / License</div>
                        <div className="text-white/80">{agent.license || '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Experience</div>
                        <div className="text-white/80">{agent.yearsExperience != null ? `${agent.yearsExperience} years` : '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Account Age</div>
                        <div className="text-white/80">{agent.accountAgeDays} days</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Risk Score</div>
                        <span className={`inline-flex rounded-full border px-3 py-0.5 text-[11px] font-bold ${getRiskBadge(agent.overallRisk)}`}>
                            {agent.overallRisk} ({agent.riskScore})
                        </span>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Email Verified</div>
                        <div className={`font-semibold ${agent.user.emailVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                            {agent.user.emailVerified ? 'Yes' : 'No'}
                        </div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Profile Status</div>
                        <div className="text-white/80 font-semibold">{agent.profileStatus}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">User Role</div>
                        <div className="text-white/80 font-semibold">{agent.user.role}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Registered</div>
                        <div className="text-white/60 text-xs">{formatDate(agent.user.createdAt)}</div>
                    </div>
                </div>
            </div>

            {/* ─── Section 2: Document Verification ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 text-xs font-black">2</span>
                    Document Verification
                    <span className="ml-auto text-xs text-white/40 font-normal">
                        {agent.allDocuments.filter((d) => d.status.toUpperCase() === 'APPROVED').length} / {agent.allDocuments.length} approved
                    </span>
                </h2>

                {agent.allDocuments.length === 0 ? (
                    <p className="text-sm text-white/40 py-8 text-center">No documents uploaded yet.</p>
                ) : (
                    <div className="space-y-3">
                        {agent.allDocuments.map((doc) => {
                            const docStatus = doc.status.toUpperCase()
                            return (
                                <div key={doc.id} className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.01] px-4 py-3">
                                    {/* Doc icon */}
                                    <div className="flex-shrink-0">
                                        <div className="h-10 w-10 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                                            <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                    </div>

                                    {/* Doc info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-white">
                                            {DOC_TYPE_LABELS[doc.type] || doc.type}
                                        </div>
                                        <div className="text-xs text-white/40 mt-0.5">
                                            Uploaded {formatDate(doc.createdAt)}
                                        </div>
                                        {doc.rejectionReason && (
                                            <div className="text-xs text-red-300 mt-1">Reason: {doc.rejectionReason}</div>
                                        )}
                                    </div>

                                    {/* Status */}
                                    <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase ${getDocStatusBadge(docStatus)}`}>
                                        {docStatus}
                                    </span>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={async () => {
                                                // Fetch signed URL for private documents
                                                try {
                                                    const res = await fetch('/api/admin/agent-documents/signed-url', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ documentId: doc.id, fileUrl: doc.fileUrl }),
                                                    })
                                                    const data = await res.json()
                                                    if (res.ok && data.success && data.url) {
                                                        setPreviewUrl(data.url)
                                                    } else {
                                                        // Fallback to direct URL (for public/legacy docs)
                                                        setPreviewUrl(doc.fileUrl)
                                                    }
                                                } catch {
                                                    setPreviewUrl(doc.fileUrl)
                                                }
                                            }}
                                            className="h-8 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-[11px] font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white transition-all"
                                        >
                                            Preview
                                        </button>
                                        {docStatus !== 'APPROVED' && (
                                            <button
                                                disabled={actionBusy}
                                                onClick={async () => {
                                                    const ok = window.confirm('Approve this document?')
                                                    if (!ok) return
                                                    await postAction(`/api/admin/documents/${encodeURIComponent(doc.id)}/approve`)
                                                }}
                                                className="h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 px-3 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {docStatus !== 'REJECTED' && (
                                            <button
                                                disabled={actionBusy}
                                                onClick={() => {
                                                    setDocRejectId(doc.id)
                                                    setDocRejectReason('')
                                                }}
                                                className="h-8 rounded-lg bg-red-500/10 border border-red-500/20 px-3 text-[11px] font-bold text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                            >
                                                Reject
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ─── Section 3: Profile Information ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 text-xs font-black">3</span>
                    Profile Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Company Name</div>
                        <div className="text-white/80">{agent.company || '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">License Authority</div>
                        <div className="text-white/80">{agent.licenseAuthority || '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Primary Market</div>
                        <div className="text-white/80">{agent.primaryMarket || '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Specialization</div>
                        <div className="text-white/80">{agent.specialization.length > 0 ? agent.specialization.join(', ') : '—'}</div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Operating Cities</div>
                        <div className="text-white/80">
                            {agent.serviceAreas.length > 0
                                ? agent.serviceAreas.map((a) => `${a.city}${a.locality ? ` (${a.locality})` : ''}`).join(', ')
                                : '—'}
                        </div>
                    </div>
                    <div>
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">WhatsApp</div>
                        <div className="text-white/80">{agent.whatsapp || '—'}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Bio</div>
                        <div className="text-white/70 text-sm leading-relaxed">{agent.bio || '—'}</div>
                    </div>
                    {agent.linkedinUrl && (
                        <div>
                            <div className="text-white/40 text-xs uppercase tracking-wider mb-1">LinkedIn</div>
                            <a href={agent.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 text-xs break-all">
                                {agent.linkedinUrl}
                            </a>
                        </div>
                    )}
                    {agent.websiteUrl && (
                        <div>
                            <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Website</div>
                            <a href={agent.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 text-xs break-all">
                                {agent.websiteUrl}
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* ─── Section 4: Risk Signals ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 text-xs font-black">4</span>
                    Risk Signals
                    <span className={`ml-3 inline-flex rounded-full border px-3 py-0.5 text-[11px] font-bold ${getRiskBadge(agent.overallRisk)}`}>
                        {agent.overallRisk} RISK
                    </span>
                </h2>

                {agent.riskSignals.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.03] px-4 py-4">
                        <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm text-emerald-300 font-medium">No risk signals detected. Agent appears clean.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {agent.riskSignals.map((signal, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] px-4 py-3">
                                <span className={`flex-shrink-0 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getRiskBadge(signal.level)}`}>
                                    {signal.level}
                                </span>
                                <span className="text-sm text-white/80">{signal.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Section 5: Final Decision ─── */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400 text-xs font-black">5</span>
                    Final Decision
                </h2>

                {vs === 'APPROVED' && (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4">
                        <p className="text-emerald-300 font-semibold">✓ This agent has been approved</p>
                        {agent.approvedAt && <p className="text-xs text-emerald-300/60 mt-1">Approved on {formatDate(agent.approvedAt)}</p>}
                    </div>
                )}

                {vs === 'REJECTED' && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4">
                        <p className="text-red-300 font-semibold">✗ This agent has been rejected</p>
                        {agent.rejectionReason && <p className="text-xs text-red-300/60 mt-1">Reason: {agent.rejectionReason}</p>}
                    </div>
                )}

                {vs !== 'APPROVED' && vs !== 'REJECTED' && (
                    <div className="space-y-4">
                        {/* Move to Under Review (if PENDING or SUBMITTED) */}
                        {(vs === 'PENDING' || vs === 'SUBMITTED') && (
                            <button
                                disabled={actionBusy}
                                onClick={async () => {
                                    const ok = window.confirm('Move this agent to UNDER REVIEW?')
                                    if (!ok) return
                                    await postAction(`/api/admin/agents/${encodeURIComponent(agentId)}/review`)
                                }}
                                className="h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 px-6 text-sm font-bold text-blue-300 hover:bg-blue-500/30 transition-all disabled:opacity-50"
                            >
                                Start Review (Move to Under Review)
                            </button>
                        )}

                        {/* Comment for final decision */}
                        <div>
                            <label className="block text-xs text-white/40 uppercase tracking-wider mb-2">Admin Comment (required for final decision)</label>
                            <textarea
                                value={finalComment}
                                onChange={(e) => setFinalComment(e.target.value)}
                                placeholder="Add your review notes here..."
                                rows={3}
                                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-amber-400/40 transition-colors resize-none"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {/* Approve Agent */}
                            <button
                                disabled={actionBusy || !canFinalApprove || !finalComment.trim()}
                                onClick={async () => {
                                    const ok = window.confirm('Approve this agent? All required documents must be approved first.')
                                    if (!ok) return
                                    await postAction(`/api/admin/agents/${encodeURIComponent(agentId)}/approve`)
                                }}
                                title={
                                    !canFinalApprove
                                        ? 'All documents must be approved before approving the agent'
                                        : !finalComment.trim()
                                            ? 'Admin comment is required'
                                            : ''
                                }
                                className={`h-10 rounded-xl px-6 text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${canFinalApprove && finalComment.trim()
                                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:from-emerald-400 hover:to-emerald-500'
                                        : 'bg-white/5 text-white/30'
                                    }`}
                            >
                                ✓ Approve Agent
                            </button>

                            {/* Reject Agent */}
                            <button
                                disabled={actionBusy}
                                onClick={() => {
                                    setRejectModalOpen(true)
                                    setRejectReason('')
                                }}
                                className="h-10 rounded-xl bg-red-500/20 border border-red-500/30 px-6 text-sm font-bold text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50"
                            >
                                ✗ Reject Agent
                            </button>
                        </div>

                        {!canFinalApprove && agent.allDocuments.length > 0 && (
                            <p className="text-xs text-amber-300/70 mt-1">
                                ⚠ All documents must be approved before you can approve this agent.
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Document Preview Modal ─── */}
            {previewUrl && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <div className="relative max-w-4xl max-h-[90vh] w-full rounded-2xl border border-white/10 bg-[#0c1425] p-2 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06]">
                            <span className="text-sm font-semibold text-white/70">Document Preview</span>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="h-8 w-8 rounded-lg border border-white/10 bg-white/[0.04] flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center max-h-[80vh] overflow-auto">
                            {previewUrl.match(/\.(pdf)$/i) ? (
                                <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg" />
                            ) : (
                                <img src={previewUrl} alt="Document" className="max-w-full max-h-[70vh] rounded-lg object-contain" />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Agent Reject Modal ─── */}
            {rejectModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setRejectModalOpen(false)} />
                    <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1425] p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Reject Agent</h3>
                        <p className="text-sm text-white/50 mb-4">Provide a reason for rejecting this agent. The agent will be notified.</p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows={4}
                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-red-400/40 transition-colors resize-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setRejectModalOpen(false)}
                                className="h-10 rounded-xl border border-white/10 px-5 text-sm font-semibold text-white/60 hover:bg-white/[0.04] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={actionBusy || !rejectReason.trim()}
                                onClick={async () => {
                                    const success = await postAction(`/api/admin/agents/${encodeURIComponent(agentId)}/reject`, { reason: rejectReason.trim() })
                                    if (success) setRejectModalOpen(false)
                                }}
                                className="h-10 rounded-xl bg-red-500 px-5 text-sm font-bold text-white hover:bg-red-400 transition-all disabled:opacity-40"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Document Reject Modal ─── */}
            {docRejectId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDocRejectId(null)} />
                    <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0c1425] p-6">
                        <h3 className="text-lg font-bold text-white mb-4">Reject Document</h3>
                        <p className="text-sm text-white/50 mb-4">Provide a reason for rejecting this document.</p>
                        <textarea
                            value={docRejectReason}
                            onChange={(e) => setDocRejectReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            rows={3}
                            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm text-white/90 placeholder:text-white/20 focus:outline-none focus:border-red-400/40 transition-colors resize-none"
                            autoFocus
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setDocRejectId(null)}
                                className="h-10 rounded-xl border border-white/10 px-5 text-sm font-semibold text-white/60 hover:bg-white/[0.04] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={actionBusy || !docRejectReason.trim()}
                                onClick={async () => {
                                    const success = await postAction(`/api/admin/documents/${encodeURIComponent(docRejectId)}/reject`, { reason: docRejectReason.trim() })
                                    if (success) setDocRejectId(null)
                                }}
                                className="h-10 rounded-xl bg-red-500 px-5 text-sm font-bold text-white hover:bg-red-400 transition-all disabled:opacity-40"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
