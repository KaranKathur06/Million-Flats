import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const leadSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    email: z.string().email('Valid email required'),
    phone: z.string().min(5, 'Phone is required').max(30),
    message: z.string().max(2000).optional(),
})

export async function POST(req: Request, { params }: { params: { slug: string } }) {
    try {
        const projectSlug = (params.slug || '').trim()
        if (!projectSlug) {
            return NextResponse.json({ success: false, message: 'Missing project slug' }, { status: 400 })
        }

        const body = await req.json().catch(() => ({}))
        const parsed = leadSchema.safeParse(body)
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Validation failed', errors: parsed.error.flatten().fieldErrors },
                { status: 400 }
            )
        }

        // Verify project exists and is published
        const project = await (prisma as any).project.findUnique({
            where: { slug: projectSlug },
            select: { id: true, name: true, slug: true, status: true, isDeleted: true },
        })

        if (!project || project.status !== 'PUBLISHED' || project.isDeleted) {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        const lead = await (prisma as any).projectLead.create({
            data: {
                projectId: project.id,
                name: parsed.data.name,
                email: parsed.data.email,
                phone: parsed.data.phone,
                message: parsed.data.message || null,
            },
        })

        const { createLead } = await import('@/lib/leads/createLead')
        await createLead({
            leadType: 'PROJECT',
            name: parsed.data.name,
            email: parsed.data.email,
            phone: parsed.data.phone,
            message: parsed.data.message || null,
            category: project.name,
            sourceName: project.name,
            projectOrCompany: project.name,
            country: 'UAE',
            status: 'NEW',
            projectId: project.id,
            sourceId: project.id,
            legacyTable: 'project_leads',
            legacyId: lead.id,
        }).catch((err: unknown) => console.error('Lead create (project):', err))

        return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/projects/[slug]/lead]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}

