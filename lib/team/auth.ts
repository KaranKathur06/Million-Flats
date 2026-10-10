/**
 * lib/team/auth.ts
 *
 * Server-side authorization utilities for the private team directory.
 * All checks query the database directly — never trust client-supplied claims.
 *
 * Three concepts are kept distinct:
 *  1. Authenticated identity   — resolved via getServerSession()
 *  2. Team membership          — TeamAccess.isRevoked === false
 *  3. Team administration      — TeamAccess.isTeamAdmin === true (+ not revoked)
 */

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ── Shared result types ───────────────────────────────────────────────────────

type Denied = { ok: false; status: 401 | 403; message: string }
type TeamMemberAccess = {
  ok: true
  userId: string
  email: string
  isTeamAdmin: boolean
  teamAccessId: string
}
type TeamResult = TeamMemberAccess | Denied

// ── Internal: resolve authenticated DB user ───────────────────────────────────

async function resolveAuthenticatedUser(): Promise<
  { ok: true; userId: string; email: string } | Denied
> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const email = String((session.user as any).email || '').trim().toLowerCase()
  if (!email) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const dbUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true },
  })

  if (!dbUser) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  if (dbUser.status === 'SUSPENDED' || dbUser.status === 'BANNED') {
    return { ok: false, status: 403, message: 'Account suspended' }
  }

  return { ok: true, userId: dbUser.id, email: dbUser.email }
}

// ── requireTeamAccess ─────────────────────────────────────────────────────────

/**
 * Requires an authenticated session AND an active (non-revoked) TeamAccess record.
 * Used to gate the /team directory page and its read API.
 *
 * Fail-closed: any error in auth or DB lookup returns a denied result.
 */
export async function requireTeamAccess(): Promise<TeamResult> {
  try {
    const identity = await resolveAuthenticatedUser()
    if (!identity.ok) return identity

    const access = await prisma.teamAccess.findUnique({
      where: { userId: identity.userId },
      select: { id: true, isRevoked: true, isTeamAdmin: true },
    })

    if (!access || access.isRevoked) {
      return { ok: false, status: 403, message: 'Team access required' }
    }

    return {
      ok: true,
      userId: identity.userId,
      email: identity.email,
      isTeamAdmin: access.isTeamAdmin,
      teamAccessId: access.id,
    }
  } catch {
    // Fail closed: authorization lookup failure must not grant access
    return { ok: false, status: 403, message: 'Team access required' }
  }
}

// ── requireTeamAdmin ──────────────────────────────────────────────────────────

/**
 * Requires an authenticated session AND an active TeamAccess record where
 * isTeamAdmin === true. Used to gate all profile and membership management operations.
 *
 * Fail-closed: any error returns denied.
 */
export async function requireTeamAdmin(): Promise<TeamResult> {
  try {
    const identity = await resolveAuthenticatedUser()
    if (!identity.ok) return identity

    const access = await prisma.teamAccess.findUnique({
      where: { userId: identity.userId },
      select: { id: true, isRevoked: true, isTeamAdmin: true },
    })

    if (!access || access.isRevoked || !access.isTeamAdmin) {
      return { ok: false, status: 403, message: 'Team administration access required' }
    }

    return {
      ok: true,
      userId: identity.userId,
      email: identity.email,
      isTeamAdmin: true,
      teamAccessId: access.id,
    }
  } catch {
    return { ok: false, status: 403, message: 'Team administration access required' }
  }
}

// ── Guard-admin-lockout invariant ─────────────────────────────────────────────

/**
 * Returns the count of active (non-revoked) team admins.
 * Used to prevent the last admin from being removed or revoked.
 */
export async function countActiveTeamAdmins(): Promise<number> {
  return prisma.teamAccess.count({
    where: { isTeamAdmin: true, isRevoked: false },
  })
}

// ── Convenience: API route response helpers ───────────────────────────────────

export function unauthorizedResponse(message = 'Unauthorized') {
  return Response.json({ error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'Forbidden') {
  return Response.json({ error: message }, { status: 403 })
}

export function denyTeamResult(result: Denied): Response {
  return result.status === 401
    ? unauthorizedResponse(result.message)
    : forbiddenResponse(result.message)
}
