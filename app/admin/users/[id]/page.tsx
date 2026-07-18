import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { hasMinRole, normalizeRole } from '@/lib/rbac'
import { getUserHealthScore, getLifecycleStage, getCRMStage } from '@/lib/userIntelligence'
import Link from 'next/link'

function safeString(v: unknown) {
  return typeof v === 'string' ? v : ''
}

function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return '—'
  return phone
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(value)
}

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const role = normalizeRole((session?.user as any)?.role)
  if (!session?.user) redirect('/user/login')
  if (!hasMinRole(role, 'ADMIN')) redirect('/')

  const id = String(params.id || '')
  const user = await (prisma as any).user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      phone: true,
      image: true,
      country: { select: { name: true } },
      profileCompletion: true,
      emailVerified: true,
      createdAt: true,
      lastLogin: true,
      _count: { select: { savedProperties: true, propertyLeads: true } },
      // Onboarding fields
      city: true,
      occupation: true,
      ageGroup: true,
      purpose: true,
      interestedCountry: true,
      budgetMin: true,
      budgetMax: true,
      propertyTypes: true,
      bedrooms: true,
      preferredCities: true,
      preferredLocalities: true,
      buyingTimeline: true,
      investmentGoal: true,
      servicesInterested: true,
      communicationPrefs: true,
      marketingConsent: true,
      // Related profiles
      agent: { select: { id: true, company: true, whatsapp: true, profileStatus: true } },
      developerProfile: { select: { id: true, companyName: true, slug: true, onboardingStatus: true } },
      agencyProfile: { select: { id: true, agencyName: true, slug: true, onboardingStatus: true } },
    },
  })

  const healthScore = getUserHealthScore({
    emailVerified: Boolean(user.emailVerified),
    profileCompletion: Number(user.profileCompletion || 0),
    status: safeString(user.status),
    savedPropertiesCount: Number((user as any)._count?.savedProperties || 0),
    propertyLeadsCount: Number((user as any)._count?.propertyLeads || 0),
  })

  const lifecycleStage = getLifecycleStage({
    emailVerified: Boolean(user.emailVerified),
    profileCompletion: Number(user.profileCompletion || 0),
    status: safeString(user.status),
    savedPropertiesCount: Number((user as any)._count?.savedProperties || 0),
    propertyLeadsCount: Number((user as any)._count?.propertyLeads || 0),
  })

  const crmStage = getCRMStage({
    emailVerified: Boolean(user.emailVerified),
    profileCompletion: Number(user.profileCompletion || 0),
    status: safeString(user.status),
    savedPropertiesCount: Number((user as any)._count?.savedProperties || 0),
    propertyLeadsCount: Number((user as any)._count?.propertyLeads || 0),
  })

  const getDisplayName = () => {
    if (safeString(user.name)) return user.name
    if (safeString(user.email)) return user.email
    if (safeString(user.phone)) return 'Unnamed User'
    return 'Anonymous'
  }

  const getPrimaryIdentifier = () => {
    return safeString(user.email) || safeString(user.phone) || 'Unknown'
  }

  // Check if user has filled onboarding data
  const hasOnboardingData = Boolean(
    user.purpose ||
    user.interestedCountry ||
    user.budgetMin ||
    user.budgetMax ||
    (user.propertyTypes && user.propertyTypes.length > 0) ||
    user.buyingTimeline ||
    user.investmentGoal
  )

  // Define role detection variables
  const isAgent = user.role === 'AGENT' && user.agent;
  const isDeveloper = user.role === 'DEVELOPER' && user.developerProfile;
  const isAgency = user.role === 'AGENCY' && user.agencyProfile;

  // Create role profile link
  let roleProfileLink: { href: string; label: string; icon: string } | null = null;
  if (isAgent) {
    roleProfileLink = {
      href: `/admin/agents`,
      label: 'View Agent Profile',
      icon: '👤',
    };
  } else if (isDeveloper) {
    roleProfileLink = {
      href: `/admin/developer-profiles/${user.developerProfile?.id}`,
      label: 'View Developer Profile',
      icon: '🏢',
    };
  } else if (isAgency) {
    roleProfileLink = {
      href: `/admin/agencies/${user.agencyProfile?.id}`,
      label: 'View Agency Profile',
      icon: '🏛️',
    };
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md bg-amber-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-amber-400">Admin</span>
            {isAgent && <span className="inline-flex h-6 items-center rounded-md bg-blue-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-blue-400">Agent</span>}
            {isDeveloper && <span className="inline-flex h-6 items-center rounded-md bg-purple-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-purple-400">Developer</span>}
            {isAgency && <span className="inline-flex h-6 items-center rounded-md bg-cyan-400/10 px-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400">Agency</span>}
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">User detail</h1>
          <p className="mt-1 text-sm text-white/50">Manage user identity, profile completion, and CRM linkage.</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
          {roleProfileLink && (
            <Link
              href={roleProfileLink.href}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/10 transition whitespace-nowrap"
            >
              {roleProfileLink.icon} {roleProfileLink.label}
            </Link>
          )}
          <Link
            href="/admin/users"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white/80 hover:bg-white/10 transition whitespace-nowrap"
          >
            Back to users
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/5 text-xl text-white/90">
                  {user.image ? (
                    <img src={user.image} alt={getDisplayName()} className="h-16 w-16 rounded-3xl object-cover" />
                  ) : (
                    <span>{getDisplayName().slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">{getDisplayName()}</h2>
                  <p className="text-sm text-white/50">{getPrimaryIdentifier()}</p>
                </div>
              </div>
              <div className="grid gap-2 sm:text-right">
                <div className="text-xs uppercase tracking-wider text-white/40">Member since</div>
                <div className="text-sm text-white/90">{new Date(user.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-white/50">Role</p>
                <p className="mt-2 text-lg font-semibold text-white">{user.role}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-xs uppercase tracking-wider text-white/50">Status</p>
                <p className="mt-2 text-lg font-semibold text-white">{(user as any).status || 'Active'}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Lifecycle stage</div>
                <div className="mt-2 text-lg font-semibold text-white">{lifecycleStage}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">CRM stage</div>
                <div className="mt-2 text-lg font-semibold text-white">{crmStage}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Health score</div>
                <div className="mt-2 text-lg font-semibold text-white">{healthScore}</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Profile completion</div>
                <div className="mt-2 text-lg font-semibold text-white">{user.profileCompletion}%</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Email verified</div>
                <div className="mt-2 text-lg font-semibold text-white">{user.emailVerified ? 'Yes' : 'No'}</div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Country</div>
                <div className="mt-2 text-lg font-semibold text-white/90">{user.country?.name || 'Unknown'}</div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-white/50">Last login</div>
                <div className="mt-2 text-lg font-semibold text-white/90">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <span className="text-xs uppercase tracking-wider text-white/50">Email</span>
                  <span className="text-sm font-semibold text-white/90 text-right">{user.email || '—'}</span>
                </div>
                <div className="flex justify-between items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <span className="text-xs uppercase tracking-wider text-white/50">Phone</span>
                  <span className="text-sm font-semibold text-white/90 text-right">{formatPhoneNumber(user.phone)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding Data Section */}
        {hasOnboardingData && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-emerald-200">Onboarding Profile & Preferences</h3>
              <span className="inline-flex h-5 items-center rounded-md bg-emerald-400/10 px-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">Filled</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {user.purpose && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Purpose</div>
                  <div className="mt-2 text-sm font-semibold text-white/90">{safeString(user.purpose)}</div>
                </div>
              )}

              {user.interestedCountry && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Interested Country</div>
                  <div className="mt-2 text-sm font-semibold text-white/90">{safeString(user.interestedCountry)}</div>
                </div>
              )}

              {(user.budgetMin || user.budgetMax) && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Budget Range</div>
                  <div className="mt-2 text-sm font-semibold text-white/90">
                    {formatCurrency(user.budgetMin)} - {formatCurrency(user.budgetMax)}
                  </div>
                </div>
              )}

              {user.propertyTypes && user.propertyTypes.length > 0 && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Property Types</div>
                  <div className="mt-2 text-sm font-semibold text-white/90 flex flex-wrap gap-2">
                    {user.propertyTypes.map((type: string) => (
                      <span key={type} className="inline-block bg-emerald-500/20 text-emerald-200 px-2 py-1 rounded text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user.bedrooms && user.bedrooms.length > 0 && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Bedrooms</div>
                  <div className="mt-2 text-sm font-semibold text-white/90 flex flex-wrap gap-2">
                    {user.bedrooms.map((br: string) => (
                      <span key={br} className="inline-block bg-emerald-500/20 text-emerald-200 px-2 py-1 rounded text-xs">
                        {br}BR
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {user.buyingTimeline && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Buying Timeline</div>
                  <div className="mt-2 text-sm font-semibold text-white/90">{safeString(user.buyingTimeline)}</div>
                </div>
              )}

              {user.investmentGoal && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Investment Goal</div>
                  <div className="mt-2 text-sm font-semibold text-white/90">{safeString(user.investmentGoal)}</div>
                </div>
              )}

              {user.city && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">City</div>
                  <div className="mt-2 text-sm font-semibold text-white/90">{safeString(user.city)}</div>
                </div>
              )}

              {user.occupation && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Occupation</div>
                  <div className="mt-2 text-sm font-semibold text-white/90">{safeString(user.occupation)}</div>
                </div>
              )}

              {user.ageGroup && (
                <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-emerald-300">Age Group</div>
                  <div className="mt-2 text-sm font-semibold text-white/90">{safeString(user.ageGroup)}</div>
                </div>
              )}
            </div>

            {user.preferredCities && user.preferredCities.length > 0 && (
              <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-emerald-300 mb-3">Preferred Cities</div>
                <div className="flex flex-wrap gap-2">
                  {user.preferredCities.map((city: string) => (
                    <span key={city} className="inline-block bg-emerald-500/20 text-emerald-200 px-3 py-1 rounded text-xs">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {user.servicesInterested && user.servicesInterested.length > 0 && (
              <div className="rounded-xl border border-emerald-500/10 bg-black/20 p-4">
                <div className="text-xs uppercase tracking-wider text-emerald-300 mb-3">Services Interested In</div>
                <div className="flex flex-wrap gap-2">
                  {user.servicesInterested.map((service: string) => (
                    <span key={service} className="inline-block bg-emerald-500/20 text-emerald-200 px-3 py-1 rounded text-xs">
                      {service}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Activity Summary</h3>
                <p className="text-xs text-white/50">User engagement and property interaction metrics.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="text-xs text-white/50">Saved Properties</div>
                <div className="mt-1 text-lg font-semibold text-white">{(user as any)._count?.savedProperties || 0}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="text-xs text-white/50">Property Leads</div>
                <div className="mt-1 text-lg font-semibold text-white">{(user as any)._count?.propertyLeads || 0}</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-3">
                <div className="text-xs text-white/50">Account Age</div>
                <div className="mt-1 text-lg font-semibold text-white">{Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))}d</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Admin actions</h3>
              <div className="grid gap-3">
                <Link
                  href="/admin/users"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 transition text-center"
                >
                  View user list
                </Link>
                <a
                  href={`/api/admin/users/${encodeURIComponent(user.id)}/export`}
                  className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10 transition text-center"
                >
                  Export user data
                </a>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-sm font-semibold text-white mb-3">CRM integration</h3>
              <div className="space-y-2 text-sm text-white/70">
                <p>CRM lead record will sync automatically from user activity.</p>
                <ul className="list-disc space-y-1 pl-5 text-white/70 text-xs">
                  <li>Registration source</li>
                  <li>Last activity</li>
                  <li>Saved properties</li>
                  {hasOnboardingData && <li>Onboarding preferences</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

