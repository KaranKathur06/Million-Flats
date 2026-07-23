type TxClient = {
  [key: string]: any
}

export type PartnerLifecycleSource = 'SELF_REGISTRATION' | 'ADMIN_MANUAL' | 'IMPORT'

type DeveloperRegistrationInput = {
  userId: string
  email: string
  companyName: string
  phone?: string | null
  phoneCountryCode?: string | null
  website?: string | null
  countryIso2?: string | null
  city?: string | null
  source?: PartnerLifecycleSource
}

type AgencyRegistrationInput = {
  userId: string
  email: string
  agencyName: string
  phone?: string | null
  phoneCountryCode?: string | null
  website?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  source?: PartnerLifecycleSource
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 90) || 'profile'
}

async function uniqueSlug(tx: TxClient, modelName: string, baseValue: string, currentId?: string | null) {
  const base = slugify(baseValue)
  let slug = base
  let counter = 1

  while (true) {
    const existing = await tx[modelName].findUnique({ where: { slug }, select: { id: true } }).catch(() => null)
    if (!existing || existing.id === currentId) return slug
    slug = `${base}-${counter++}`
  }
}

async function writeLifecycleAudit(
  tx: TxClient,
  input: {
    entityType: string
    entityId: string
    action: string
    performedByUserId?: string | null
    beforeState?: unknown
    afterState?: unknown
    meta?: unknown
  },
) {
  await tx.auditLog.create({
    data: {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      performedByUserId: input.performedByUserId || null,
      beforeState: input.beforeState ?? null,
      afterState: input.afterState ?? null,
      meta: input.meta ?? null,
    },
  }).catch(() => null)
}

function countryCodeFromIso2(countryIso2?: string | null) {
  return String(countryIso2 || '').toUpperCase() === 'IN' ? 'INDIA' : 'UAE'
}

export async function createDeveloperLifecycle(tx: TxClient, input: DeveloperRegistrationInput) {
  const developerSlug = await uniqueSlug(tx, 'developer', input.companyName)

  const developer = await tx.developer.create({
    data: {
      name: input.companyName,
      slug: developerSlug,
      email: input.email,
      phone: input.phone || null,
      website: input.website || null,
      countryCode: countryCodeFromIso2(input.countryIso2),
      countryIso2: input.countryIso2 || null,
      city: input.city || null,
      status: 'ACTIVE',
      isFeatured: false,
      aiScore: 0,
    },
    select: { id: true, slug: true },
  })

  const profileSlug = await uniqueSlug(tx, 'developerProfile', input.companyName)
  const profile = await tx.developerProfile.create({
    data: {
      userId: input.userId,
      linkedDeveloperId: developer.id,
      companyName: input.companyName,
      slug: profileSlug,
      phone: input.phone || null,
      phoneCountryCode: input.phoneCountryCode || null,
      website: input.website || null,
      citiesServed: input.city ? [input.city] : [],
      onboardingStatus: 'REGISTERED',
      kycStatus: 'PENDING',
      isVerified: false,
      isFeatured: false,
      profileCompletion: 0,
      aiDeveloperScore: 0,
    },
  })

  await writeLifecycleAudit(tx, {
    entityType: 'DEVELOPER_PROFILE',
    entityId: profile.id,
    action: 'DEVELOPER_PROFILE_SUBMITTED',
    performedByUserId: input.userId,
    afterState: {
      userId: input.userId,
      developerProfileId: profile.id,
      linkedDeveloperId: developer.id,
      source: input.source || 'SELF_REGISTRATION',
    },
  })

  return { developer, profile }
}

export async function createAgencyLifecycle(tx: TxClient, input: AgencyRegistrationInput) {
  const agency = await tx.agency.create({
    data: {
      name: input.agencyName,
      countryCode: countryCodeFromIso2(input.country),
      countryIso2: input.country || null,
      isFeatured: false,
    },
    select: { id: true },
  })

  const profileSlug = await uniqueSlug(tx, 'agencyProfile', input.agencyName)
  const profile = await tx.agencyProfile.create({
    data: {
      userId: input.userId,
      linkedAgencyId: agency.id,
      agencyName: input.agencyName,
      slug: profileSlug,
      email: input.email,
      phone: input.phone || null,
      phoneCountryCode: input.phoneCountryCode || null,
      country: input.country || null,
      state: input.state || null,
      city: input.city || null,
      website: input.website || null,
      onboardingStatus: 'REGISTERED',
      kycStatus: 'PENDING',
      isVerified: false,
      isFeatured: false,
      profileCompletion: 0,
      aiAgencyScore: 0,
    },
  })

  await writeLifecycleAudit(tx, {
    entityType: 'AGENCY_PROFILE',
    entityId: profile.id,
    action: 'AGENCY_PROFILE_SUBMITTED',
    performedByUserId: input.userId,
    afterState: {
      userId: input.userId,
      agencyProfileId: profile.id,
      linkedAgencyId: agency.id,
      source: input.source || 'SELF_REGISTRATION',
    },
  })

  return { agency, profile }
}

export async function ensureDeveloperPublicRecord(
  tx: TxClient,
  profile: any,
  performedByUserId?: string | null,
) {
  if (profile.linkedDeveloperId) return profile.linkedDeveloperId
  if (!profile.companyName) return null

  const slug = await uniqueSlug(tx, 'developer', profile.companyName)
  const developer = await tx.developer.create({
    data: {
      name: profile.companyName,
      slug,
      logo: profile.logo || null,
      banner: profile.banner || null,
      email: profile.user?.email || null,
      phone: profile.phone || null,
      website: profile.website || null,
      city: Array.isArray(profile.citiesServed) ? profile.citiesServed[0] || null : null,
      description: profile.description || null,
      shortDescription: profile.shortDescription || null,
      foundedYear: profile.foundedYear || null,
      headquarters: profile.headquarters || null,
      status: 'ACTIVE',
      isFeatured: Boolean(profile.isFeatured),
      featuredRank: profile.featuredRank || null,
      aiScore: Number(profile.aiDeveloperScore || 0),
    },
    select: { id: true },
  })

  await writeLifecycleAudit(tx, {
    entityType: 'DEVELOPER_PROFILE',
    entityId: profile.id,
    action: 'ADMIN_DEVELOPER_LINKED',
    performedByUserId,
    afterState: { linkedDeveloperId: developer.id },
  })

  return developer.id
}

export async function approveDeveloperLifecycle(
  tx: TxClient,
  profile: any,
  input: { performedByUserId?: string | null; adminNotes?: string | null },
) {
  const now = new Date()
  const developerId = await ensureDeveloperPublicRecord(tx, profile, input.performedByUserId)

  if (developerId) {
    await tx.developer.update({
      where: { id: developerId },
      data: {
        name: profile.companyName || undefined,
        logo: profile.logo || null,
        banner: profile.banner || null,
        email: profile.user?.email || null,
        phone: profile.phone || null,
        website: profile.website || null,
        description: profile.description || null,
        shortDescription: profile.shortDescription || null,
        foundedYear: profile.foundedYear || null,
        headquarters: profile.headquarters || null,
        status: 'ACTIVE',
        isFeatured: Boolean(profile.isFeatured),
        featuredRank: profile.featuredRank || null,
        aiScore: Number(profile.aiDeveloperScore || 0),
      },
    }).catch(() => null)
  }

  const updated = await tx.developerProfile.update({
    where: { id: profile.id },
    data: {
      onboardingStatus: 'APPROVED',
      kycStatus: 'VERIFIED',
      isVerified: true,
      verifiedAt: now,
      approvedBy: input.performedByUserId || null,
      approvedAt: now,
      linkedDeveloperId: developerId,
      adminNotes: input.adminNotes || profile.adminNotes || null,
      rejectionReason: null,
    },
  })

  await writeLifecycleAudit(tx, {
    entityType: 'DEVELOPER_PROFILE',
    entityId: profile.id,
    action: 'ADMIN_DEVELOPER_APPROVED',
    performedByUserId: input.performedByUserId,
    afterState: { linkedDeveloperId: developerId, onboardingStatus: 'APPROVED' },
  })

  return updated
}

export async function approveAgencyLifecycle(
  tx: TxClient,
  profile: any,
  input: { performedByUserId?: string | null },
) {
  const now = new Date()
  let agencyId = profile.linkedAgencyId

  if (!agencyId && profile.agencyName) {
    const agency = await tx.agency.create({
      data: {
        name: profile.agencyName,
        countryCode: countryCodeFromIso2(profile.country),
        countryIso2: profile.country || null,
        isFeatured: Boolean(profile.isFeatured),
      },
      select: { id: true },
    })
    agencyId = agency.id
  }

  if (agencyId) {
    await tx.agency.update({
      where: { id: agencyId },
      data: {
        name: profile.agencyName || undefined,
        isFeatured: Boolean(profile.isFeatured),
        countryIso2: profile.country || null,
        countryCode: countryCodeFromIso2(profile.country),
      },
    }).catch(() => null)
  }

  const updated = await tx.agencyProfile.update({
    where: { id: profile.id },
    data: {
      onboardingStatus: 'APPROVED',
      kycStatus: 'VERIFIED',
      isVerified: true,
      verifiedAt: now,
      approvedBy: input.performedByUserId || null,
      approvedAt: now,
      linkedAgencyId: agencyId,
      rejectionReason: null,
    },
  })

  await writeLifecycleAudit(tx, {
    entityType: 'AGENCY_PROFILE',
    entityId: profile.id,
    action: 'ADMIN_AGENCY_APPROVED',
    performedByUserId: input.performedByUserId,
    afterState: { linkedAgencyId: agencyId, onboardingStatus: 'APPROVED' },
  })

  return updated
}

