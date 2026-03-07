import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const leadSchema = z.object({
    name: z.string().min(1, 'Name is required').max(200),
    email: z.string().email('Valid email required'),
    phone: z.string().min(5, 'Phone is required').max(30),
    message: z.string().max(2000).optional(),
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const projectId = (params.id || '').trim()
        if (!projectId) {
            return NextResponse.json({ success: false, message: 'Missing project id' }, { status: 400 })
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
            where: { id: projectId },
            select: { id: true, status: true },
        })

        if (!project || project.status !== 'PUBLISHED') {
            return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
        }

        const lead = await (prisma as any).projectLead.create({
            data: {
                projectId,
                name: parsed.data.name,
                email: parsed.data.email,
                phone: parsed.data.phone,
                message: parsed.data.message || null,
            },
        })

        return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 })
    } catch (err: any) {
        console.error('[POST /api/projects/[id]/lead]', err)
        return NextResponse.json({ success: false, message: 'Internal error' }, { status: 500 })
    }
}
