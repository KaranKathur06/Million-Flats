import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DeveloperProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/developer/auth?tab=login')

  const userId = (session.user as any)?.id
  const profile = await (prisma as any).developerProfile.findUnique({ where: { userId }, select: { id: true } })
  if (!profile) redirect('/developer/onboarding')

  const project = await (prisma as any).project.findFirst({
    where: { id: params.id, ownedByProfileId: profile.id },
    include: {
      projectUnitTypes: { include: { variants: true } },
      media: { orderBy: { sortOrder: 'asc' } },
      developer: { select: { name: true, slug: true } },
      _count: { select: { leads: true } },
    },
  })

  if (!project) notFound()

  const STATUS_COLOR: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    PUBLISHED: 'bg-emerald-100 text-emerald-700',
    ARCHIVED: 'bg-red-100 text-red-600',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/developer/projects" className="hover:text-gray-700 transition-colors">Projects</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{project.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[project.status] || STATUS_COLOR.DRAFT}`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          {project.city && <p className="text-sm text-gray-500">{project.city}{project.locality ? `, ${project.locality}` : ''}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {project.status === 'PUBLISHED' && project.slug && (
            <Link href={`/projects/${project.slug}`} target="_blank"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              View Live ↗
            </Link>
          )}
          <Link href={`/developer/projects/${project.id}/edit`}
            className="px-4 py-2 text-sm font-semibold text-white bg-dark-blue rounded-xl hover:bg-dark-blue/90 transition-all">
            Edit Project
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Leads', value: project._count?.leads || 0, icon: '👥' },
          { label: 'Unit Types', value: project.projectUnitTypes?.length || 0, icon: '🏠' },
          { label: 'Media', value: project.media?.length || 0, icon: '🖼️' },
          { label: 'Price From', value: project.startPrice ? `${project.currency || 'AED'} ${Number(project.startPrice).toLocaleString()}` : '—', icon: '💰' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="text-xl mb-1">{s.icon}</div>
            <p className="text-lg font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Content sections */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {project.description && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Unit Types */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Unit Types</h2>
              <Link href={`/developer/projects/${project.id}/units`}
                className="text-sm text-dark-blue font-medium hover:underline">
                {project.projectUnitTypes?.length ? 'Manage' : '+ Add Unit Types'}
              </Link>
            </div>
            {project.projectUnitTypes?.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-400">No unit types added yet.</p>
                <Link href={`/developer/projects/${project.id}/units`}
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-dark-blue hover:underline">
                  + Add Unit Types
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {project.projectUnitTypes.map((ut: any) => (
                  <div key={ut.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{ut.name}</p>
                      {ut.areaMin && ut.areaMax && (
                        <p className="text-xs text-gray-400">{ut.areaMin}–{ut.areaMax} {ut.areaUnit || 'sqft'}</p>
                      )}
                    </div>
                    {ut.priceFrom && (
                      <p className="text-sm font-semibold text-gray-700">
                        {project.currency} {Number(ut.priceFrom).toLocaleString()}+
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Project details */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Details</h2>
            <div className="space-y-3 text-sm">
              {project.propertyType && <div className="flex justify-between"><span className="text-gray-400">Type</span><span className="text-gray-700 font-medium">{project.propertyType}</span></div>}
              {project.reraProjectNumber && <div className="flex justify-between"><span className="text-gray-400">RERA</span><span className="text-gray-700 font-medium">{project.reraProjectNumber}</span></div>}
              {project.possessionDate && <div className="flex justify-between"><span className="text-gray-400">Possession</span><span className="text-gray-700 font-medium">{new Date(project.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span></div>}
              {project.totalUnits && <div className="flex justify-between"><span className="text-gray-400">Total Units</span><span className="text-gray-700 font-medium">{project.totalUnits}</span></div>}
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <h2 className="font-semibold text-gray-900 mb-3">Actions</h2>
            {project.status === 'DRAFT' && (
              <button className="w-full h-10 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all">
                Submit for Review
              </button>
            )}
            {project.status === 'PUBLISHED' && (
              <button className="w-full h-10 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">
                Unpublish
              </button>
            )}
            <Link href={`/developer/leads?projectId=${project.id}`}
              className="w-full h-10 flex items-center justify-center bg-blue-50 text-dark-blue rounded-xl text-sm font-medium hover:bg-blue-100 transition-all">
              View Leads for this Project
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
