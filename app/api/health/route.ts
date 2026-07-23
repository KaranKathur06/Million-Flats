import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildApiSuccessEnvelope } from '@/lib/api-response'

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json(buildApiSuccessEnvelope({ ok: true, service: 'millionflats' }, 'Healthy'))
  } catch (error) {
    console.error('Health check failed:', error)
    return NextResponse.json({ success: false, error: { code: 'DB_UNHEALTHY', message: 'Database unavailable' } }, { status: 503 })
  }
}
