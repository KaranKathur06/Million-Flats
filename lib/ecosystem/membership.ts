import { createHash, randomBytes } from 'crypto'
import { Prisma } from '@prisma/client'
import { getAuthenticatedEcosystemUser, type EcosystemUser } from '@/lib/ecosystem/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/sendEmail'
import { buildAbsoluteUrl } from '@/lib/email/sendEmail'

export type PartnerPermission =
  | 'leads.view_all'
  | 'leads.view_assigned'
  | 'leads.manage_all'
  | 'leads.manage_assigned'
  | 'leads.assign'
  | 'profile.edit'
  | 'profile.stage_sensitive'
  | 'members.manage'

export type PartnerMembershipContext = {
  user: EcosystemUser
  membership: {
    id: string
    partnerId: string
    role: 'OWNER' | 'ADMIN' | 'MEMBER'
    partner: { id: string; name: string; status: string; isActive: boolean }
  }
}

const PERMISSIONS: Record<PartnerMembershipContext['membership']['role'], PartnerPermission[]> = {
  OWNER: [
    'leads.view_all', 'leads.view_assigned', 'leads.manage_all', 'leads.manage_assigned',
    'leads.assign', 'profile.edit', 'profile.stage_sensitive', 'members.manage',
  ],
  ADMIN: [
    'leads.view_all', 'leads.view_assigned', 'leads.manage_all', 'leads.manage_assigned',
    'leads.assign', 'profile.edit', 'profile.stage_sensitive', 'members.manage',
  ],
  MEMBER: ['leads.view_assigned', 'leads.manage_assigned'],
}

export function hasPartnerPermission(
  role: PartnerMembershipContext['membership']['role'],
  permission: PartnerPermission
): boolean {
  return PERMISSIONS[role].includes(permission)
}

export class PartnerAccessError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'PartnerAccessError'
  }
}

export async function requirePartnerPermission(
  partnerId: string,
  permission: PartnerPermission
): Promise<PartnerMembershipContext> {
  const user = await getAuthenticatedEcosystemUser()
  if (!user) throw new PartnerAccessError('A verified MillionFlats account is required.', 401)

  const membership = await (prisma as any).ecosystemPartnerMembership.findFirst({
    where: {
      partnerId,
      userId: user.id,
      status: 'ACTIVE',
      partner: { status: 'APPROVED', isActive: true },
    },
    select: {
      id: true,
      partnerId: true,
      role: true,
      partner: { select: { id: true, name: true, status: true, isActive: true } },
    },
  })
  if (!membership || !hasPartnerPermission(membership.role as PartnerMembershipContext['membership']['role'], permission)) {
    throw new PartnerAccessError('Partner access is unavailable.', 403)
  }
  return { user, membership }
}

export function isPlatformAdmin(user: EcosystemUser): boolean {
  return user.role === 'ADMIN' || user.role === 'SUPERADMIN'
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function writeMembershipAudit(
  tx: any,
  actorId: string,
  membershipId: string,
  beforeState: unknown,
  afterState: unknown,
  action = 'ECOSYSTEM_PARTNER_MEMBER_CHANGED'
) {
  const toAuditState = (value: any) => value
    ? {
        id: value.id,
        partnerId: value.partnerId,
        userId: value.userId,
        inviteEmail: value.inviteEmail,
        role: value.role,
        status: value.status,
        invitedByUserId: value.invitedByUserId,
        acceptedAt: value.acceptedAt?.toISOString?.() || null,
        revokedAt: value.revokedAt?.toISOString?.() || null,
        createdAt: value.createdAt?.toISOString?.() || null,
      }
    : null
  await tx.auditLog.create({
    data: {
      entityType: 'ECOSYSTEM_PARTNER_MEMBERSHIP',
      entityId: membershipId,
      action,
      performedByUserId: actorId,
      beforeState: toAuditState(beforeState) as Prisma.InputJsonValue,
      afterState: toAuditState(afterState) as Prisma.InputJsonValue,
    },
  })
}

export async function invitePartnerMember(input: {
  partnerId: string
  email: string
  role: 'ADMIN' | 'MEMBER' | 'OWNER'
  actor: EcosystemUser
}) {
  const email = normalizeEmail(input.email)
  if (!email || email.length > 254) throw new PartnerAccessError('Enter a valid invitation email.', 400)
  if (input.role === 'OWNER' && !isPlatformAdmin(input.actor)) {
    throw new PartnerAccessError('Only a platform administrator can grant partner ownership.', 403)
  }
  if (!isPlatformAdmin(input.actor)) {
    await requirePartnerPermission(input.partnerId, 'members.manage')
    if (input.role === 'OWNER') throw new PartnerAccessError('Only a platform administrator can grant partner ownership.', 403)
  }

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const existingUser = await (prisma as any).user.findUnique({
    where: { email },
    select: { id: true, status: true },
  })
  if (existingUser && existingUser.status !== 'ACTIVE') {
    throw new PartnerAccessError('This account is not eligible for a partner invitation.', 400)
  }

  const membership = await (prisma as any).$transaction(async (tx: any) => {
    const partner = await tx.ecosystemPartner.findFirst({
      where: { id: input.partnerId, status: 'APPROVED', isActive: true },
      select: { id: true, name: true },
    })
    if (!partner) throw new PartnerAccessError('Partner access is unavailable.', 404)

    const current = await tx.ecosystemPartnerMembership.findUnique({
      where: { partnerId_inviteEmail: { partnerId: input.partnerId, inviteEmail: email } },
    })
    if (current?.status === 'ACTIVE') {
      throw new PartnerAccessError('This account is already a partner member.', 409)
    }

    const data = {
      inviteEmail: email,
      role: input.role,
      status: 'INVITED',
      invitationTokenHash: hashToken(token),
      invitationExpiresAt: expiresAt,
      invitedByUserId: input.actor.id,
      userId: null,
      acceptedAt: null,
      revokedAt: null,
    }
    const saved = current
      ? await tx.ecosystemPartnerMembership.update({ where: { id: current.id }, data })
      : await tx.ecosystemPartnerMembership.create({ data: { ...data, partnerId: input.partnerId } })
    await writeMembershipAudit(tx, input.actor.id, saved.id, current, saved)
    return { ...saved, partner }
  })

  const inviteUrl = buildAbsoluteUrl(`/dashboard/ecosystem-partner/invitations/accept?token=${encodeURIComponent(token)}`)
  const delivery = await sendEmail({
    to: email,
    subject: `Invitation to manage ${membership.partner.name} on MillionFlats`,
    text: [
      `You have been invited to join ${membership.partner.name} as a ${input.role.toLowerCase()}.`,
      '',
      'Sign in or create a MillionFlats account with this email address, verify it, and accept the invitation:',
      inviteUrl,
      '',
      'This invitation expires in seven days.',
    ].join('\n'),
  })
  return { membershipId: membership.id, deliveryStatus: delivery.ok ? 'sent' as const : 'pending' as const }
}

export async function acceptPartnerInvitation(token: string, user: EcosystemUser) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    throw new PartnerAccessError('This invitation is invalid or expired.', 404)
  }
  const tokenHash = hashToken(token)
  return (prisma as any).$transaction(async (tx: any) => {
    const invite = await tx.ecosystemPartnerMembership.findUnique({
      where: { invitationTokenHash: tokenHash },
      include: { partner: { select: { id: true, name: true, status: true, isActive: true } } },
    })
    if (
      !invite ||
      invite.status === 'REVOKED' ||
      invite.inviteEmail !== normalizeEmail(user.email) ||
      !invite.invitationExpiresAt ||
      invite.invitationExpiresAt <= new Date() ||
      invite.partner.status !== 'APPROVED' ||
      !invite.partner.isActive
    ) {
      throw new PartnerAccessError('This invitation is invalid or expired.', 404)
    }
    if (invite.status === 'ACTIVE') {
      if (invite.userId === user.id) return { membershipId: invite.id, partnerId: invite.partnerId, reused: true }
      throw new PartnerAccessError('This invitation has already been accepted.', 409)
    }

    const count = await tx.ecosystemPartnerMembership.updateMany({
      where: { id: invite.id, status: 'INVITED', invitationTokenHash: tokenHash, invitationExpiresAt: { gt: new Date() } },
      data: { userId: user.id, status: 'ACTIVE', acceptedAt: new Date() },
    })
    if (count.count !== 1) throw new PartnerAccessError('This invitation has already been used.', 409)
    const accepted = await tx.ecosystemPartnerMembership.findUnique({ where: { id: invite.id } })
    await writeMembershipAudit(tx, user.id, invite.id, invite, accepted)
    return { membershipId: invite.id, partnerId: invite.partnerId, reused: false }
  })
}

export async function changePartnerMember(input: {
  partnerId: string
  membershipId: string
  actor: EcosystemUser
  role?: 'ADMIN' | 'MEMBER'
  revoke?: boolean
}) {
  await requirePartnerPermission(input.partnerId, 'members.manage')
  return (prisma as any).$transaction(async (tx: any) => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.partnerId}))`)
    const membership = await tx.ecosystemPartnerMembership.findFirst({
      where: { id: input.membershipId, partnerId: input.partnerId, status: { in: ['ACTIVE', 'INVITED'] } },
    })
    if (!membership) throw new PartnerAccessError('Partner member not found.', 404)
    if (membership.role === 'OWNER' && (membership.status === 'ACTIVE' || input.role)) {
      throw new PartnerAccessError('Only a platform administrator can change partner owners.', 403)
    }
    const updateData = input.revoke
      ? { status: 'REVOKED', revokedAt: new Date(), invitationTokenHash: null }
      : input.role
        ? { role: input.role }
        : null
    if (!updateData) throw new PartnerAccessError('A valid membership change is required.', 400)
    const updated = await tx.ecosystemPartnerMembership.update({ where: { id: membership.id }, data: updateData })
    await writeMembershipAudit(tx, input.actor.id, membership.id, membership, updated)
    return updated
  })
}

export async function setPartnerMemberRoleByAdmin(input: {
  partnerId: string
  membershipId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  actor: EcosystemUser
}) {
  if (!isPlatformAdmin(input.actor)) {
    throw new PartnerAccessError('Platform administrator access is required.', 403)
  }
  return (prisma as any).$transaction(async (tx: any) => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.partnerId}))`)
    const membership = await tx.ecosystemPartnerMembership.findFirst({
      where: { id: input.membershipId, partnerId: input.partnerId },
    })
    if (!membership || membership.status === 'REVOKED') {
      throw new PartnerAccessError('Partner member not found.', 404)
    }
    if (membership.status === 'ACTIVE' && membership.role === 'OWNER' && input.role !== 'OWNER') {
      const ownerCount = await tx.ecosystemPartnerMembership.count({
        where: { partnerId: input.partnerId, status: 'ACTIVE', role: 'OWNER' },
      })
      if (ownerCount <= 1) throw new PartnerAccessError('A partner must retain at least one active owner.', 409)
    }
    const updated = await tx.ecosystemPartnerMembership.update({
      where: { id: membership.id },
      data: { role: input.role },
    })
    await writeMembershipAudit(tx, input.actor.id, membership.id, membership, updated)
    return updated
  })
}

export async function revokePartnerMemberByAdmin(input: {
  partnerId: string
  membershipId: string
  actor: EcosystemUser
}) {
  if (!isPlatformAdmin(input.actor)) {
    throw new PartnerAccessError('Platform administrator access is required.', 403)
  }
  return (prisma as any).$transaction(async (tx: any) => {
    await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${input.partnerId}))`)
    const membership = await tx.ecosystemPartnerMembership.findFirst({
      where: { id: input.membershipId, partnerId: input.partnerId, status: { not: 'REVOKED' } },
    })
    if (!membership) throw new PartnerAccessError('Partner member not found.', 404)
    if (membership.status === 'ACTIVE' && membership.role === 'OWNER') {
      const ownerCount = await tx.ecosystemPartnerMembership.count({
        where: { partnerId: input.partnerId, status: 'ACTIVE', role: 'OWNER' },
      })
      if (ownerCount <= 1) throw new PartnerAccessError('A partner must retain at least one active owner.', 409)
    }
    const updated = await tx.ecosystemPartnerMembership.update({
      where: { id: membership.id },
      data: { status: 'REVOKED', revokedAt: new Date(), invitationTokenHash: null },
    })
    await writeMembershipAudit(tx, input.actor.id, membership.id, membership, updated)
    return updated
  })
}

export async function listPartnerMemberships(partnerId: string) {
  await requirePartnerPermission(partnerId, 'members.manage')
  return (prisma as any).ecosystemPartnerMembership.findMany({
    where: { partnerId },
    select: {
      id: true, inviteEmail: true, role: true, status: true, acceptedAt: true, createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  })
}

const SENSITIVE_PROFILE_FIELDS = new Set([
  'name', 'logo', 'coverImage', 'contactPerson', 'contactEmail', 'contactPhone',
  'whatsapp', 'website', 'gstNumber', 'registrationNumber', 'pricingRange',
  'categoryData', 'serviceAreas', 'logoStorageKey', 'logoFileSize',
  'coverStorageKey', 'coverFileSize',
])

export async function updatePartnerProfile(
  partnerId: string,
  actor: EcosystemUser,
  changes: Record<string, string | null>
) {
  const { membership } = await requirePartnerPermission(partnerId, 'profile.edit')
  const allowed = new Set(['tagline', 'shortDescription', 'description', 'locationCoverage'])
  const keys = Object.keys(changes)
  if (!keys.length || keys.some((key) => !allowed.has(key) || SENSITIVE_PROFILE_FIELDS.has(key))) {
    throw new PartnerAccessError('One or more profile fields cannot be edited here.', 400)
  }
  const updated = await (prisma as any).$transaction(async (tx: any) => {
    const before = await tx.ecosystemPartner.findUnique({
      where: { id: partnerId },
      select: Object.fromEntries(keys.map((key) => [key, true])),
    })
    if (!before) throw new PartnerAccessError('Partner access is unavailable.', 404)
    const after = await tx.ecosystemPartner.update({
      where: { id: partnerId },
      data: changes,
      select: { id: true, name: true, tagline: true, shortDescription: true, description: true, locationCoverage: true },
    })
    await tx.auditLog.create({
      data: {
        entityType: 'ECOSYSTEM_PARTNER',
        entityId: partnerId,
        action: 'ECOSYSTEM_PARTNER_PROFILE_EDITED',
        performedByUserId: actor.id,
        beforeState: before,
        afterState: after,
        meta: { membershipId: membership.id },
      },
    })
    return after
  })
  return updated
}

export async function savePartnerOfferings(input: {
  partnerId: string
  actor: EcosystemUser
  services?: Array<{ name: string; description?: string | null }>
  locations?: Array<{ city: string; region?: string | null; isPrimary: boolean }>
}) {
  const { membership } = await requirePartnerPermission(input.partnerId, 'profile.edit')
  if (!input.services && !input.locations) {
    throw new PartnerAccessError('Provide services or service locations.', 400)
  }
  return (prisma as any).$transaction(async (tx: any) => {
    const before: Record<string, unknown> = {}
    if (input.services) {
      before.services = await tx.ecosystemPartnerService.findMany({
        where: { partnerId: input.partnerId },
        orderBy: { sortOrder: 'asc' },
      })
      await tx.ecosystemPartnerService.deleteMany({ where: { partnerId: input.partnerId } })
      if (input.services.length) {
        await tx.ecosystemPartnerService.createMany({
          data: input.services.map((service, index) => ({
            partnerId: input.partnerId,
            name: service.name.trim(),
            description: service.description?.trim() || null,
            sortOrder: index,
          })),
        })
      }
    }
    if (input.locations) {
      before.locations = await tx.ecosystemPartnerLocation.findMany({
        where: { partnerId: input.partnerId },
        orderBy: { sortOrder: 'asc' },
      })
      await tx.ecosystemPartnerLocation.deleteMany({ where: { partnerId: input.partnerId } })
      if (input.locations.length) {
        await tx.ecosystemPartnerLocation.createMany({
          data: input.locations.map((location, index) => ({
            partnerId: input.partnerId,
            city: location.city.trim(),
            region: location.region?.trim() || null,
            isPrimary: location.isPrimary,
            sortOrder: index,
          })),
        })
      }
    }
    const after = { services: input.services ?? null, locations: input.locations ?? null }
    await tx.auditLog.create({
      data: {
        entityType: 'ECOSYSTEM_PARTNER',
        entityId: input.partnerId,
        action: 'ECOSYSTEM_PARTNER_PROFILE_EDITED',
        performedByUserId: input.actor.id,
        beforeState: before as Prisma.InputJsonValue,
        afterState: after as Prisma.InputJsonValue,
        meta: { membershipId: membership.id, profileSection: 'offerings' },
      },
    })
    return after
  })
}

export async function submitSensitivePartnerChange(
  partnerId: string,
  actor: EcosystemUser,
  changes: Record<string, unknown>
) {
  const { membership } = await requirePartnerPermission(partnerId, 'profile.stage_sensitive')
  const keys = Object.keys(changes)
  if (!keys.length || keys.some((key) => !SENSITIVE_PROFILE_FIELDS.has(key))) {
    throw new PartnerAccessError('One or more sensitive profile fields are not allowed.', 400)
  }
  const request = await (prisma as any).$transaction(async (tx: any) => {
    const pending = await tx.ecosystemPartnerChangeRequest.findFirst({
      where: { partnerId, status: 'PENDING' },
      select: { id: true },
    })
    if (pending) throw new PartnerAccessError('Resolve the pending profile change before submitting another.', 409)
    const created = await tx.ecosystemPartnerChangeRequest.create({
      data: {
        partnerId,
        submittedByUserId: actor.id,
        requestedChanges: changes,
      },
    })
    await tx.auditLog.create({
      data: {
        entityType: 'ECOSYSTEM_PARTNER_CHANGE_REQUEST',
        entityId: created.id,
        action: 'ECOSYSTEM_PARTNER_CHANGE_REVIEWED',
        performedByUserId: actor.id,
        beforeState: null,
        afterState: created,
        meta: { event: 'SUBMITTED', membershipId: membership.id },
      },
    })
    return created
  })
  return request
}

export async function reviewSensitivePartnerChange(input: {
  requestId: string
  reviewer: EcosystemUser
  decision: 'APPROVED' | 'REJECTED'
  reason: string
}) {
  const adminUser = await getAuthenticatedEcosystemUser()
  if (!adminUser || !isPlatformAdmin(adminUser)) {
    throw new PartnerAccessError('Platform administrator access is required.', 403)
  }
  if (input.decision === 'REJECTED' && input.reason.trim().length < 3) {
    throw new PartnerAccessError('A reason is required when rejecting changes.', 400)
  }
  return (prisma as any).$transaction(async (tx: any) => {
    const request = await tx.ecosystemPartnerChangeRequest.findUnique({
      where: { id: input.requestId },
    })
    if (!request || request.status !== 'PENDING') {
      throw new PartnerAccessError('Pending profile change not found.', 404)
    }
    const changes = request.requestedChanges as Record<string, unknown>
    const keys = Object.keys(changes)
    if (!keys.length || keys.some((key) => !SENSITIVE_PROFILE_FIELDS.has(key))) {
      throw new PartnerAccessError('The requested changes contain unsupported fields.', 400)
    }
    const profileChanges = Object.fromEntries(
      Object.entries(changes).filter(([key]) => !key.endsWith('StorageKey') && !key.endsWith('FileSize'))
    )
    const before = input.decision === 'APPROVED'
      ? await tx.ecosystemPartner.findUnique({
          where: { id: request.partnerId },
          select: Object.fromEntries(Object.keys(profileChanges).map((key) => [key, true])),
        })
      : null
    const replacedStorageKeys: string[] = []
    if (input.decision === 'APPROVED') {
      await tx.ecosystemPartner.update({ where: { id: request.partnerId }, data: profileChanges })
      for (const mediaType of ['LOGO', 'COVER'] as const) {
        const prefix = mediaType === 'LOGO' ? 'logo' : 'cover'
        const storageKey = changes[`${prefix}StorageKey`]
        if (typeof storageKey !== 'string') continue
        const existingMedia = await tx.ecosystemPartnerMedia.findUnique({
          where: { partnerId_type: { partnerId: request.partnerId, type: mediaType } },
          select: { storageKey: true },
        })
        if (existingMedia?.storageKey && existingMedia.storageKey !== storageKey) {
          replacedStorageKeys.push(existingMedia.storageKey)
        }
        await tx.ecosystemPartnerMedia.upsert({
          where: { partnerId_type: { partnerId: request.partnerId, type: mediaType } },
          create: {
            partnerId: request.partnerId,
            type: mediaType,
            storageKey,
            publicUrl: String(changes[prefix] || ''),
            mimeType: 'image/webp',
            fileSize: Number(changes[`${prefix}FileSize`] || 0),
            altText: `Partner ${mediaType.toLowerCase()}`,
          },
          update: {
            storageKey,
            publicUrl: String(changes[prefix] || ''),
            mimeType: 'image/webp',
            fileSize: Number(changes[`${prefix}FileSize`] || 0),
          },
        })
      }
    }
    const updated = await tx.ecosystemPartnerChangeRequest.update({
      where: { id: request.id },
      data: {
        status: input.decision,
        reviewedByUserId: input.reviewer.id,
        reviewReason: input.reason.trim() || null,
        reviewedAt: new Date(),
      },
    })
    await tx.auditLog.create({
      data: {
        entityType: 'ECOSYSTEM_PARTNER_CHANGE_REQUEST',
        entityId: request.id,
        action: 'ECOSYSTEM_PARTNER_CHANGE_REVIEWED',
        performedByUserId: input.reviewer.id,
        beforeState: before,
        afterState: input.decision === 'APPROVED' ? profileChanges : { status: input.decision },
        meta: { reason: input.reason.trim() || null, partnerId: request.partnerId },
      },
    })
    return {
      ...updated,
      replacedStorageKeys,
      rejectedStorageKeys: input.decision === 'REJECTED'
        ? [changes.logoStorageKey, changes.coverStorageKey].filter((key): key is string => typeof key === 'string')
        : [],
    }
  })
}

export async function getPartnerDashboard(partnerId: string) {
  const context = await requirePartnerPermission(partnerId, 'leads.view_assigned')
  const canViewAll = context.membership.role !== 'MEMBER'
  const leadWhere = {
    ecosystemPartnerId: partnerId,
    deletedAt: null,
    ...(canViewAll ? {} : { assignedTo: context.user.id }),
  }
  const [partner, leads, total, statusCounts] = await Promise.all([
    (prisma as any).ecosystemPartner.findUnique({
      where: { id: partnerId },
      select: {
        id: true, name: true, slug: true, tagline: true, shortDescription: true,
        description: true, locationCoverage: true, logo: true, coverImage: true,
        category: { select: { slug: true, title: true } },
        services: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, description: true } },
        locations: { orderBy: { sortOrder: 'asc' }, select: { id: true, city: true, region: true, isPrimary: true } },
      },
    }),
    (prisma as any).lead.findMany({
      where: leadWhere,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, name: true, email: true, phone: true, message: true, status: true,
        assignedTo: true, createdAt: true, budgetRange: true, propertyType: true,
      },
    }),
    (prisma as any).lead.count({ where: leadWhere }),
    (prisma as any).lead.groupBy({
      by: ['status'],
      where: leadWhere,
      _count: { _all: true },
    }),
  ])
  if (!partner) throw new PartnerAccessError('Partner access is unavailable.', 404)
  return {
    partner,
    role: context.membership.role,
    leads,
    total,
    statusCounts: statusCounts.map((item: any) => ({ status: item.status, count: item._count._all })),
  }
}

export async function updatePartnerLead(input: {
  partnerId: string
  leadId: string
  actor: EcosystemUser
  status?: 'NEW' | 'CONTACTED' | 'WON' | 'LOST'
  assignedTo?: string | null
  followUp?: { scheduledAt: Date; action: string; notes?: string | null }
}) {
  const { membership } = await requirePartnerPermission(input.partnerId, 'leads.view_assigned')
  const isManager = membership.role !== 'MEMBER'
  if (input.assignedTo !== undefined && (!isManager || !PERMISSIONS[membership.role].includes('leads.assign'))) {
    throw new PartnerAccessError('You cannot assign partner leads.', 403)
  }
  if (input.status !== undefined && !PERMISSIONS[membership.role].includes(isManager ? 'leads.manage_all' : 'leads.manage_assigned')) {
    throw new PartnerAccessError('You cannot update this lead.', 403)
  }
  if (!input.status && input.assignedTo === undefined && !input.followUp) {
    throw new PartnerAccessError('A lead update is required.', 400)
  }

  return (prisma as any).$transaction(async (tx: any) => {
    const lead = await tx.lead.findFirst({
      where: {
        id: input.leadId,
        ecosystemPartnerId: input.partnerId,
        deletedAt: null,
        ...(isManager ? {} : { assignedTo: input.actor.id }),
      },
      select: { id: true, status: true, assignedTo: true },
    })
    if (!lead) throw new PartnerAccessError('Partner lead not found.', 404)
    if (input.assignedTo) {
      const assignee = await tx.ecosystemPartnerMembership.findFirst({
        where: {
          partnerId: input.partnerId,
          userId: input.assignedTo,
          status: 'ACTIVE',
        },
        select: { id: true },
      })
      if (!assignee) throw new PartnerAccessError('Select an active member of this partner.', 400)
    }

    const data: Record<string, unknown> = {}
    if (input.status) data.status = input.status
    if (input.assignedTo !== undefined) data.assignedTo = input.assignedTo
    if (Object.keys(data).length) {
      await tx.lead.update({ where: { id: lead.id }, data })
      if (input.status && input.status !== lead.status) {
        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'STATUS_CHANGED',
            summary: `Partner changed lead status to ${input.status}`,
            actorId: input.actor.id,
            metadata: { before: lead.status, after: input.status, partnerId: input.partnerId },
          },
        })
      }
      if (input.assignedTo !== undefined && input.assignedTo !== lead.assignedTo) {
        await tx.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'ASSIGNED',
            summary: input.assignedTo ? 'Partner lead assigned to a member' : 'Partner lead assignment removed',
            actorId: input.actor.id,
            metadata: { before: lead.assignedTo, after: input.assignedTo, partnerId: input.partnerId },
          },
        })
      }
    }
    if (input.followUp) {
      await tx.leadFollowUp.create({
        data: {
          leadId: lead.id,
          action: input.followUp.action,
          scheduledAt: input.followUp.scheduledAt,
          assignedTo: input.actor.id,
          notes: input.followUp.notes || null,
        },
      })
      await tx.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'FOLLOW_UP_SCHEDULED',
          summary: 'Partner follow-up scheduled',
          actorId: input.actor.id,
          metadata: { scheduledAt: input.followUp.scheduledAt.toISOString(), partnerId: input.partnerId },
        },
      })
    }
    return { success: true }
  })
}
