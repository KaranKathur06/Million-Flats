import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ProjectPageSkeleton } from '@/components/skeletons/ProjectPageSkeletons'
import ProjectDetailClient from './ProjectDetailClient'
import { getRecommendationsForContext } from '@/lib/ecosystem/getRecommendedPartners'
import { getPublicProjectBySlug } from '@/lib/projects/getPublicProjectBySlug'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isSearchBot } from '@/lib/botDetection'

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

    const session = await getServerSession(authOptions)
    const isBot = isSearchBot()
    const isAuthenticated = !!session?.user
    
    // Determine lock state: Guest users (non-bots) get gated content
    const isLocked = !isAuthenticated && !isBot

    // Strict Server-Side Data Splitting
    const publicData = {
        id: project.id,
        name: project.name,
        slug: project.slug,
        city: project.city,
        community: project.community,
        countryIso2: project.countryIso2,
        startingPrice: project.startingPrice,
        goldenVisa: project.goldenVisa,
        coverImage: project.coverImage,
        highlights: project.highlights,
        completionYear: project.completionYear,
        status: project.status,
        createdAt: project.createdAt,
        amenities: project.amenities,
        paymentPlans: project.paymentPlans,
        unitTypes: project.unitTypes.map((ut: any) => ({
            ...ut,
            variants: ut.variants?.map((v: any) => ({ ...v, floorPlans: [] })) || []
        })),
        floorPlans: project.floorPlans,
        // Include minimal media for Hero Image resolution
        media: project.media.filter((m: any) => m.mediaType === 'hero' || m.category === 'hero').slice(0, 1),
        mediaStructured: project.mediaStructured,
        // Include basic developer info for the hero badge
        developer: project.developer ? { name: project.developer.name, slug: project.developer.slug } : null
    };

    // Private Data is strictly null for guests
    const privateData = isLocked ? null : {
        description: project.description,
        developer: project.developer, // full developer data with logo, rating, etc.
        media: project.media, // full gallery
        brochure: project.brochure,
        location: project.location,
        nearbyPlaces: project.nearbyPlaces,
        videos: project.videos,
        similarProjects: project.similarProjects
    };

    const ecosystemRecommendations = await getRecommendationsForContext('project', {
        city: project.city || undefined,
    }).catch(() => [])

    return (
        <Suspense fallback={<ProjectPageSkeleton />}>
            <ProjectDetailClient 
               publicData={publicData}
               privateData={privateData}
               ecosystemRecommendations={ecosystemRecommendations} 
               isLocked={isLocked}
            />
        </Suspense>
    )
}
