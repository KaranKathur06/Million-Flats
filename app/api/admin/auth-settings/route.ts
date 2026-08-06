/**
 * GET  /api/admin/auth-settings  → Get current auth settings (ADMIN+ roles)
 * POST /api/admin/auth-settings  → Update auth settings (SUPERADMIN only)
 *
 * Protected endpoint. Requires active admin session.
 * Logs all changes to the audit trail.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getAuthSettings,
  updateAuthSettings,
  invalidateAuthSettingsCache,
} from '@/lib/auth/auth-settings-service'
import { writeAuditLog } from '@/lib/audit'

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

function isAdminRole(role: string): boolean {
  const r = role.toUpperCase()
  return r === 'ADMIN' || r === 'SUPERADMIN' || r === 'MODERATOR' || r === 'VERIFIER'
}

function isSuperAdmin(role: string): boolean {
  return role.toUpperCase() === 'SUPERADMIN'
}

// ─── GET: Fetch current settings ─────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = String((session?.user as any)?.role || '').toUpperCase()

    if (!session?.user || !isAdminRole(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getAuthSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[admin/auth-settings] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST: Update settings ───────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const role = String((session?.user as any)?.role || '').toUpperCase()
    const userId = String((session?.user as any)?.id || '')

    if (!session?.user || !isAdminRole(role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPERADMIN can modify auth settings
    if (!isSuperAdmin(role)) {
      return NextResponse.json(
        { error: 'Only Super Admins can modify authentication settings.' },
        { status: 403 },
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Get current settings for audit trail
    const beforeSettings = await getAuthSettings()

    // Validate activeMode if provided
    const validModes = ['EMAIL_ONLY', 'WHATSAPP_ONLY', 'EMAIL_AND_WHATSAPP', 'DISABLED']
    if (body.activeMode && !validModes.includes(body.activeMode)) {
      return NextResponse.json({ error: 'Invalid authentication mode.' }, { status: 400 })
    }

    // Build update payload (only include fields that were explicitly provided)
    const updateData: Record<string, any> = {}
    const booleanFields = [
      'allowEmail', 'allowWhatsapp', 'allowGoogle', 'allowApple', 'allowPasskeys',
      'allowRegistration', 'allowForgotPassword', 'requireEmailVerification',
      'allowMultipleSessions', 'requireMfa',
    ]

    if (body.activeMode) updateData.activeMode = body.activeMode
    for (const field of booleanFields) {
      if (typeof body[field] === 'boolean') updateData[field] = body[field]
    }
    if (typeof body.maintenanceMessage === 'string') {
      updateData.maintenanceMessage = body.maintenanceMessage.trim() || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided.' }, { status: 400 })
    }

    // Update
    const updatedSettings = await updateAuthSettings(updateData, userId)

    // Write audit log
    const ipAddress = getClientIp(request)
    await writeAuditLog({
      entityType: 'USER',
      entityId: 'auth-settings-singleton',
      action: 'AUTH_SETTINGS_UPDATED' as any,
      performedByUserId: userId,
      ipAddress,
      beforeState: beforeSettings,
      afterState: updatedSettings,
      meta: {
        changedFields: Object.keys(updateData),
        browser: request.headers.get('user-agent')?.slice(0, 200),
      },
    }).catch(() => null)

    console.log(`[admin/auth-settings] Updated by ${userId}: ${JSON.stringify(updateData)}`)

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'Authentication settings updated. Changes are live within seconds.',
    })
  } catch (error) {
    console.error('[admin/auth-settings] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
