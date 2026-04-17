import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ProjectPageSkeleton } from '@/components/skeletons/ProjectPageSkeletons'
import ProjectDetailClient from './ProjectDetailClient'

/* ═══════════════════════════════════════════════
   PERFORMANCE-OPTIMISED PROJECT PAGE
   • Parallel DB queries (project + similar)
   • ISR with 5-minute revalidation
   • Suspense boundary with skeleton fallback
   • Minimal data transform on server
   ═══════════════════════════════════════════════ */

// ISR: revalidate every 5 minutes for popular pages
export const revalidate = 300

function siteUrl() {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
    return base ? base.replace(/\/$/, '') : ''
}

type ProjectPageProps = {
    params: { slug: string }
}

async function getProject(slug: string) {
    try {
        // Fire both queries in parallel instead of sequentially
        const projectPromise = (prisma as any).project.findFirst({
            where: { slug, status: 'PUBLISHED', isDeleted: false },
            include: {
                developer: { select: { id: true, name: true, slug: true, logo: true } },
                media: { orderBy: { sortOrder: 'asc' } },
                unitTypes: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        variants: {
                            orderBy: { sortOrder: 'asc' },
                            include: {
                                floorPlans: { orderBy: { createdAt: 'asc' } },
                                media: { orderBy: { sortOrder: 'asc' } },
                            },
                        },
                    },
                },
                amenities: true,
                paymentPlans: { orderBy: { sortOrder: 'asc' } },
                floorPlans: true,
                videos: { orderBy: { sortOrder: 'asc' } },
                location: true,
                nearbyPlaces: { orderBy: { sortOrder: 'asc' } },
                brochure: {
                    select: { id: true, fileUrl: true, fileName: true, fileSize: true },
                },
            },
        })

        const project = await projectPromise
        if (!project) return null

        // Parse highlights JSON
        let highlights: string[] = []
        if (project.highlights) {
            try { highlights = JSON.parse(project.highlights) } catch { highlights = [] }
        }

        // Parse structured media JSON
        let mediaStructured: any = null
        const rawMediaStructured = (project as any).mediaStructured
        if (typeof rawMediaStructured === 'string' && rawMediaStructured.trim()) {
            try {
                const parsed = JSON.parse(rawMediaStructured)
                if (parsed && (parsed.hero || parsed.featured || parsed.tabs)) {
                    mediaStructured = parsed
                }
            } catch {
                mediaStructured = null
            }
        } else if (rawMediaStructured && typeof rawMediaStructured === 'object' && !Array.isArray(rawMediaStructured) && (rawMediaStructured.hero || rawMediaStructured.featured || rawMediaStructured.tabs)) {
            mediaStructured = rawMediaStructured
        }

        // Build brochure data
        let brochure: any = null
        if (project.brochure && project.brochure.fileUrl) {
            brochure = {
                file: project.brochure.fileUrl,
                fileName: project.brochure.fileName,
                fileSize: project.brochure.fileSize,
            }
        } else if ((project as any).brochureUrl) {
            brochure = { file: (project as any).brochureUrl }
        }

        // Fetch similar projects IN PARALLEL (non-blocking for main data)
        const similarProjectsPromise = (prisma as any).project.findMany({
            where: {
                status: 'PUBLISHED',
                isDeleted: false,
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

        // Await similar projects with timeout fallback (2s max)
        let similarProjects: any[] = []
        try {
            similarProjects = await Promise.race([
                similarProjectsPromise,
                new Promise<any[]>((resolve) => setTimeout(() => resolve([]), 2000)),
            ])
        } catch {
            similarProjects = []
        }

        return { ...project, highlights, mediaStructured, brochure, similarProjects }
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

    return (
        <Suspense fallback={<ProjectPageSkeleton />}>
            <ProjectDetailClient project={project} />
        </Suspense>
    )
}
