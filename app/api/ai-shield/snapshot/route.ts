import { NextResponse } from 'next/server'
import { getAiShieldSnapshot } from '@/lib/aishield/projects'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = (searchParams.get('projectId') || '').trim()
    if (!projectId) {
      return NextResponse.json({ success: false, message: 'Missing projectId' }, { status: 400 })
    }

    const snapshot = await getAiShieldSnapshot(projectId)
    if (!snapshot) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, snapshot })
  } catch (err) {
    console.error('[GET /api/ai-shield/snapshot]', err)
    return NextResponse.json({ success: false, message: 'Unable to load snapshot' }, { status: 500 })
  }
}
