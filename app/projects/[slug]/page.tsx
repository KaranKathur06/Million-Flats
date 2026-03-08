import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import ProjectDetailClient from './ProjectDetailClient'

function siteUrl() {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
    return base ? base.replace(/\/$/, '') : ''
}

type ProjectPageProps = {
    params: { slug: string }
}

async function getProject(slug: string) {
    try {
        const project = await (prisma as any).project.findUnique({
            where: { slug },
            include: {
                developer: { select: { id: true, name: true, slug: true, logo: true } },
                media: { orderBy: { sortOrder: 'asc' } },
                unitTypes: true,
                amenities: true,
                paymentPlans: { orderBy: { sortOrder: 'asc' } },
                floorPlans: true,
                videos: { orderBy: { sortOrder: 'asc' } },
                location: true,
                nearbyPlaces: { orderBy: { sortOrder: 'asc' } },
            },
        })
        if (!project) return null

        // Parse highlights JSON
        let highlights: string[] = []
        if (project.highlights) {
            try { highlights = JSON.parse(project.highlights) } catch { highlights = [] }
        }

        // Fetch similar projects
        const similarProjects = await (prisma as any).project.findMany({
            where: {
                status: 'PUBLISHED',
                id: { not: project.id },
                OR: [
                    { developerId: project.developer?.id },
                    { city: project.city },
                ],
            },
            take: 4,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                community: true,
                startingPrice: true,
                goldenVisa: true,
                coverImage: true,
                developer: { select: { name: true } },
            },
        })

        return { ...project, highlights, similarProjects }
    } catch {
        return null
    }
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
    const project = await getProject(params.slug)
    if (!project || project.status !== 'PUBLISHED') {
        return { title: 'Project Not Found | MillionFlats' }
    }

    const base = siteUrl()
    const canonical = base ? `${base}/projects/${project.slug}` : ''
    const title = `${project.name} by ${project.developer?.name || 'Developer'} | MillionFlats`
    const description = project.description
        ? project.description.slice(0, 160)
        : `${project.name} — ${project.city || 'UAE'} by ${project.developer?.name || 'Developer'}. Starting from AED ${project.startingPrice?.toLocaleString() || 'TBD'}.`

    return {
        title,
        description,
        alternates: canonical ? { canonical } : undefined,
        openGraph: {
            title,
            description,
            url: canonical || undefined,
            type: 'website',
            images: project.coverImage ? [{ url: project.coverImage }] : undefined,
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
    const project = await getProject(params.slug)

    if (!project || project.status !== 'PUBLISHED') {
        notFound()
    }

    return <ProjectDetailClient project={project} />
}
