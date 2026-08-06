/**
 * GET /api/auth/config
 *
 * Public endpoint that returns the current authentication configuration.
 * Used by the frontend AuthConfigProvider to determine which login methods to show.
 *
 * Response: { activeMode, allowEmail, allowWhatsapp, allowGoogle, allowRegistration, maintenanceMessage }
 * Cache-Control: max-age=30 (also cached server-side in Redis for 30s)
 */

import { NextResponse } from 'next/server'
import { getAuthSettings } from '@/lib/auth/auth-settings-service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await getAuthSettings()

    // Only expose what the frontend needs — no internal flags
    const publicConfig = {
      activeMode: settings.activeMode,
      allowEmail: settings.allowEmail,
      allowWhatsapp: settings.allowWhatsapp,
      allowGoogle: settings.allowGoogle,
      allowRegistration: settings.allowRegistration,
      allowForgotPassword: settings.allowForgotPassword,
      maintenanceMessage: settings.activeMode === 'DISABLED' ? settings.maintenanceMessage : null,
    }

    return NextResponse.json(publicConfig, {
      headers: {
        'Cache-Control': 'public, max-age=30, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[api/auth/config] Error:', error)
    // Return safe defaults on error — don't break the frontend
    return NextResponse.json({
      activeMode: 'WHATSAPP_ONLY',
      allowEmail: true,
      allowWhatsapp: true,
      allowGoogle: false,
      allowRegistration: true,
      allowForgotPassword: true,
      maintenanceMessage: null,
    })
  }
}
