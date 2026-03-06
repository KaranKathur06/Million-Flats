import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import { prisma } from '@/lib/prisma'

function bad(msg: string, status = 400) {
    return NextResponse.json({ success: false, message: msg }, { status })
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
    const auth = await requireAdminSession()
    if (!auth.ok) {
        return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
    }

    const agentId = String(params?.id || '').trim()
    if (!agentId) return bad('Not found', 404)

    const agent = await (prisma as any).agent.findFirst({
        where: { id: agentId },
        select: {
            id: true,
            userId: true,
            company: true,
            license: true,
            licenseAuthority: true,
            yearsExperience: true,
            primaryMarket: true,
            specialization: true,
            linkedinUrl: true,
            websiteUrl: true,
            verificationStatus: true,
            profileStatus: true,
            profileCompletion: true,
            bio: true,
            whatsapp: true,
            approved: true,
            riskScore: true,
            approvedBy: true,
            approvedAt: true,
            rejectionReason: true,
            isFeatured: true,
            createdAt: true,
            updatedAt: true,
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    phone: true,
                    image: true,
                    role: true,
                    status: true,
                    verified: true,
                    emailVerified: true,
                    createdAt: true,
                },
            },
            serviceAreas: {
                select: {
                    id: true,
                    city: true,
                    locality: true,
                },
            },
            documents: {
                select: {
                    id: true,
                    type: true,
                    fileUrl: true,
                    status: true,
                    reviewedBy: true,
                    reviewedAt: true,
                    rejectionReason: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            },
            verificationProgress: {
                select: {
                    identityCompleted: true,
                    documentsUploaded: true,
                    businessInfoCompleted: true,
                    profileCompleted: true,
                    completionPercentage: true,
                },
            },
            verifications: {
                select: {
                    id: true,
                    documentType: true,
                    documentUrl: true,
                    status: true,
                    reviewedAt: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'asc' },
            },
        },
    })

    if (!agent) return bad('Agent not found', 404)

    // Calculate risk signals
    const riskSignals: { label: string; level: 'LOW' | 'MEDIUM' | 'HIGH' }[] = []

    // Check for duplicate phone
    if (agent.user?.phone) {
        const duplicatePhone = await (prisma as any).user.count({
            where: {
                phone: agent.user.phone,
                id: { not: agent.userId },
            },
        })
        if (duplicatePhone > 0) {
            riskSignals.push({ label: `Duplicate phone found (${duplicatePhone} other accounts)`, level: 'HIGH' })
        }
    }

    // Check for duplicate license/RERA
    if (agent.license) {
        const duplicateLicense = await (prisma as any).agent.count({
            where: {
                license: agent.license,
                id: { not: agentId },
            },
        })
        if (duplicateLicense > 0) {
            riskSignals.push({ label: `Duplicate license/RERA number`, level: 'HIGH' })
        }
    }

    // Account age check
    const accountAgeDays = agent.user?.createdAt
        ? Math.floor((Date.now() - new Date(agent.user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0

    if (accountAgeDays < 1) {
        riskSignals.push({ label: 'Account created less than 24 hours ago', level: 'MEDIUM' })
    } else if (accountAgeDays < 7) {
        riskSignals.push({ label: `Account age: ${accountAgeDays} days`, level: 'LOW' })
    }

    // Email not verified
    if (!agent.user?.emailVerified) {
        riskSignals.push({ label: 'Email not verified', level: 'MEDIUM' })
    }

    // Compute overall risk level
    const hasHigh = riskSignals.some((s) => s.level === 'HIGH')
    const hasMedium = riskSignals.some((s) => s.level === 'MEDIUM')
    const overallRisk = hasHigh ? 'HIGH' : hasMedium ? 'MEDIUM' : 'LOW'

    // Combine old verifications with new documents for backward compat
    const allDocuments = [
        ...(agent.documents || []).map((d: any) => ({
            id: d.id,
            type: d.type,
            fileUrl: d.fileUrl,
            status: d.status,
            reviewedBy: d.reviewedBy,
            reviewedAt: d.reviewedAt,
            rejectionReason: d.rejectionReason,
            createdAt: d.createdAt,
            source: 'document',
        })),
        ...(agent.verifications || []).map((v: any) => ({
            id: v.id,
            type: v.documentType,
            fileUrl: v.documentUrl,
            status: v.status,
            reviewedBy: null,
            reviewedAt: v.reviewedAt,
            rejectionReason: null,
            createdAt: v.createdAt,
            source: 'verification',
        })),
    ]

    return NextResponse.json({
        success: true,
        agent: {
            ...agent,
            allDocuments,
            riskSignals,
            overallRisk,
            accountAgeDays,
        },
    })
}
