'use client'

/* ═══════════════════════════════════════════════
   SKELETON LOADERS — Project Detail Page
   Ensures user ALWAYS sees content within 500ms
   ═══════════════════════════════════════════════ */

function Pulse({ className = '' }: { className?: string }) {
    return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />
}

/* ─── Section Header Skeleton ─── */
export function SectionHeaderSkeleton() {
    return (
        <div className="mb-6 flex items-center gap-3">
            <div className="w-1 h-6 rounded-full bg-gray-200 animate-pulse" />
            <Pulse className="h-6 w-40" />
        </div>
    )
}

/* ─── Gallery Section Skeleton ─── */
export function GallerySkeleton() {
    return (
        <div className="space-y-4">
            <SectionHeaderSkeleton />
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <Pulse className="md:col-span-2 md:row-span-2 aspect-[16/10] rounded-2xl" />
                    <Pulse className="aspect-[16/10] rounded-2xl" />
                    <Pulse className="aspect-[16/10] rounded-2xl" />
                    <Pulse className="aspect-[16/10] rounded-2xl" />
                    <Pulse className="aspect-[16/10] rounded-2xl" />
                </div>
            </div>
            <div className="flex gap-2 mt-4">
                {[1, 2, 3, 4, 5].map(i => (
                    <Pulse key={i} className="h-9 w-20 rounded-xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {[1, 2, 3, 4].map(i => (
                    <Pulse key={i} className="aspect-[4/3] rounded-2xl" />
                ))}
            </div>
        </div>
    )
}

/* ─── Location Section Skeleton ─── */
export function LocationSkeleton() {
    return (
        <div className="space-y-4">
            <SectionHeaderSkeleton />
            <Pulse className="h-4 w-3/4 rounded-lg" />
            <Pulse className="h-[350px] w-full rounded-2xl" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                {[1, 2, 3, 4].map(i => (
                    <Pulse key={i} className="h-12 rounded-xl" />
                ))}
            </div>
        </div>
    )
}

/* ─── Similar Projects Skeleton ─── */
export function SimilarProjectsSkeleton() {
    return (
        <div className="space-y-4">
            <SectionHeaderSkeleton />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <Pulse className="h-40 rounded-none" />
                        <div className="p-4 space-y-2">
                            <Pulse className="h-5 w-3/4" />
                            <Pulse className="h-3 w-1/2" />
                            <Pulse className="h-5 w-1/3 mt-2" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ─── Video Section Skeleton ─── */
export function VideosSkeleton() {
    return (
        <div className="space-y-4">
            <SectionHeaderSkeleton />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map(i => (
                    <Pulse key={i} className="aspect-video rounded-2xl" />
                ))}
            </div>
        </div>
    )
}

/* ─── VerixShield Sidebar Skeleton ─── */
export function VerixShieldSkeleton() {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="flex items-center gap-3">
                <Pulse className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5 flex-1">
                    <Pulse className="h-4 w-2/3" />
                    <Pulse className="h-3 w-1/2" />
                </div>
            </div>
            <Pulse className="h-20 w-full rounded-xl" />
            <Pulse className="h-16 w-full rounded-xl" />
            <Pulse className="h-10 w-full rounded-xl" />
        </div>
    )
}

/* ─── Floor Plans Section Skeleton ─── */
export function FloorPlansSkeleton() {
    return (
        <div className="space-y-4">
            <SectionHeaderSkeleton />
            <div className="flex gap-2 mb-4">
                {[1, 2, 3].map(i => (
                    <Pulse key={i} className="h-9 w-24 rounded-xl" />
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {[1, 2].map(i => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                        <div className="flex justify-between">
                            <Pulse className="h-4 w-24" />
                            <Pulse className="h-5 w-16 rounded-full" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Pulse className="h-10 rounded-lg" />
                            <Pulse className="h-10 rounded-lg" />
                        </div>
                        <Pulse className="h-10 w-full rounded-xl" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                        <Pulse className="aspect-square rounded-none" />
                        <div className="p-4 space-y-2">
                            <Pulse className="h-4 w-2/3" />
                            <div className="grid grid-cols-2 gap-2">
                                <Pulse className="h-8 rounded-lg" />
                                <Pulse className="h-8 rounded-lg" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* ─── Enquiry Form Skeleton ─── */
export function EnquiryFormSkeleton() {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <Pulse className="h-6 w-3/4" />
            <Pulse className="h-4 w-full" />
            <div className="space-y-3 mt-4">
                <Pulse className="h-12 w-full rounded-xl" />
                <Pulse className="h-12 w-full rounded-xl" />
                <Pulse className="h-12 w-full rounded-xl" />
                <Pulse className="h-20 w-full rounded-xl" />
                <Pulse className="h-12 w-full rounded-xl" />
            </div>
        </div>
    )
}

/* ─── Full Page Loading Skeleton ─── */
export function ProjectPageSkeleton() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero skeleton */}
            <div className="relative h-[50vh] sm:h-[60vh] lg:h-[70vh] bg-gray-200 animate-pulse">
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-16">
                    <div className="container mx-auto max-w-7xl space-y-4">
                        <Pulse className="h-8 w-48" />
                        <Pulse className="h-12 w-96 max-w-full" />
                        <div className="flex gap-4">
                            <Pulse className="h-5 w-32" />
                            <Pulse className="h-5 w-24" />
                            <Pulse className="h-5 w-28" />
                        </div>
                    </div>
                </div>
            </div>
            {/* Tab nav skeleton */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
                <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-4 py-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Pulse key={i} className="h-5 w-20" />
                        ))}
                    </div>
                </div>
            </div>
            {/* Content skeleton */}
            <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="space-y-3">
                            <Pulse className="h-6 w-48" />
                            <Pulse className="h-4 w-full" />
                            <Pulse className="h-4 w-full" />
                            <Pulse className="h-4 w-3/4" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map(i => (
                                <Pulse key={i} className="h-20 rounded-xl" />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <EnquiryFormSkeleton />
                    </div>
                </div>
            </div>
        </div>
    )
}
