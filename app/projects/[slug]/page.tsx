import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ProjectPageSkeleton } from '@/components/skeletons/ProjectPageSkeletons'
import ProjectDetailClient from './ProjectDetailClient'
import { getRecommendationsForContext } from '@/lib/ecosystem/getRecommendedPartners'
import { getPublicProjectBySlug } from '@/lib/projects/getPublicProjectBySlug'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function siteUrl() {
    const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
    return base ? base.replace(/\/$/, '') : ''
}

type ProjectPageProps = {
    params: { slug: string }
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
    const project = await getPublicProjectBySlug(params.slug)
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
    const project = await getPublicProjectBySlug(params.slug)

    if (!project || project.status !== 'PUBLISHED') {
        notFound()
    }

    const ecosystemRecommendations = await getRecommendationsForContext('project', {
        city: project.city || undefined,
    }).catch(() => [])

    return (
        <Suspense fallback={<ProjectPageSkeleton />}>
            <ProjectDetailClient project={project} ecosystemRecommendations={ecosystemRecommendations} />
        </Suspense>
    )
}
