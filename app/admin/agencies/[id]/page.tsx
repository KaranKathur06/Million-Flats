import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function AdminAgencyDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/admin/login')
  const role = (session.user as any)?.role
  if (!['ADMIN', 'SUPERADMIN', 'MODERATOR', 'VERIFIER'].includes(role)) redirect('/admin')

  const profile = await (prisma as any).agencyProfile.findUnique({
    where: { id: params.id },
    include: {
      user: { select: { id: true, email: true, name: true, createdAt: true } },
      linkedAgency: { select: { id: true, name: true } },
    },
  })

  if (!profile) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center">
          <p className="text-gray-600">Agency profile not found.</p>
          <Link href="/admin/agencies" className="text-blue-600 hover:underline text-sm mt-4 inline-block">
            ← Back to agencies
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{profile.agencyName || 'Unnamed Agency'}</h1>
          <p className="text-gray-600 text-sm mt-1">{profile.user?.email}</p>
        </div>
        <Link
          href="/admin/agencies"
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:bg-gray-50"
        >
          ← Back
        </Link>
      </div>

      {/* Info Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</div>
          <div className="text-lg font-semibold text-gray-900 capitalize">
            {(profile.onboardingStatus || '').replace(/_/g, ' ')}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">KYC Status</div>
          <div className="text-lg font-semibold text-gray-900 capitalize">
            {profile.kycStatus}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Profile Completion</div>
          <div className="text-lg font-semibold text-gray-900">{profile.profileCompletion || 0}%</div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Verified</div>
          <div className="text-lg font-semibold text-gray-900">{profile.isVerified ? '✓ Yes' : 'No'}</div>
        </div>
      </div>

      {/* Details Section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Agency Details</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {profile.shortDescription && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">Short Description</div>
              <p className="text-gray-700">{profile.shortDescription}</p>
            </div>
          )}

          {profile.city && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">City</div>
              <p className="text-gray-700">{profile.city}</p>
            </div>
          )}

          {profile.country && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">Country</div>
              <p className="text-gray-700">{profile.country}</p>
            </div>
          )}

          {profile.yearEstablished && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">Year Established</div>
              <p className="text-gray-700">{profile.yearEstablished}</p>
            </div>
          )}

          {profile.totalAgents && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">Total Agents</div>
              <p className="text-gray-700">{profile.totalAgents}</p>
            </div>
          )}

          {profile.agencySize && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">Agency Size</div>
              <p className="text-gray-700">{profile.agencySize}</p>
            </div>
          )}

          {profile.phone && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">Phone</div>
              <p className="text-gray-700">{profile.phone}</p>
            </div>
          )}

          {profile.email && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">Email</div>
              <p className="text-gray-700">{profile.email}</p>
            </div>
          )}

          {profile.website && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">Website</div>
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                {profile.website}
              </a>
            </div>
          )}
        </div>

        {profile.description && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="text-sm font-semibold text-gray-600 mb-2">Description</div>
            <p className="text-gray-700 whitespace-pre-wrap">{profile.description}</p>
          </div>
        )}
      </div>

      {/* Specializations */}
      {profile.specializations && profile.specializations.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {profile.specializations.map((spec: string) => (
              <span key={spec} className="inline-flex px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium">
                {spec}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Operating Areas */}
      {profile.operatingAreas && profile.operatingAreas.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Operating Areas</h2>
          <div className="flex flex-wrap gap-2">
            {profile.operatingAreas.map((area: string) => (
              <span key={area} className="inline-flex px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Legal Info */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Legal Information</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {profile.licenseNumber && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">License Number</div>
              <p className="text-gray-700 font-mono">{profile.licenseNumber}</p>
            </div>
          )}

          {profile.reraNumber && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">RERA Number</div>
              <p className="text-gray-700 font-mono">{profile.reraNumber}</p>
            </div>
          )}

          {profile.gstNumber && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">GST Number</div>
              <p className="text-gray-700 font-mono">{profile.gstNumber}</p>
            </div>
          )}

          {profile.panNumber && (
            <div>
              <div className="text-sm font-semibold text-gray-600 mb-2">PAN Number</div>
              <p className="text-gray-700 font-mono">{profile.panNumber}</p>
            </div>
          )}
        </div>
      </div>

      {/* Public Profile Link */}
      {profile.slug && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-6">
          <h2 className="text-xl font-bold text-emerald-900 mb-2">Public Profile</h2>
          <p className="text-sm text-emerald-800 mb-3">View this agency's public profile:</p>
          <a
            href={`/agencies/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
          >
            View Public Profile →
          </a>
        </div>
      )}
    </div>
  )
}
