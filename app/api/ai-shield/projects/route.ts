import { NextResponse } from 'next/server'
import { listAiShieldProjects, getFeaturedAiShieldProject, getAiShieldProjectBySlug } from '@/lib/aishield/projects'

/** Query params require request.url — cannot be statically generated at build time. */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const slug = (searchParams.get('slug') || '').trim()

    if (slug) {
      const project = await getAiShieldProjectBySlug(slug)
      if (!project) {
        return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 })
      }
      return NextResponse.json(
        { success: true, project },
        { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
      )
    }

    const featuredOnly = searchParams.get('featured') === 'true'
    if (featuredOnly) {
      const project = await getFeaturedAiShieldProject()
      return NextResponse.json(
        { success: true, project },
        { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
      )
    }

    const params = {
      q: searchParams.get('q') || undefined,
      city: searchParams.get('city') || undefined,
      developer: searchParams.get('developer') || undefined,
      country: searchParams.get('country') || undefined,
      budgetMin: parseFloat(searchParams.get('budget_min') || '') || undefined,
      budgetMax: parseFloat(searchParams.get('budget_max') || '') || undefined,
      bhk: parseInt(searchParams.get('bhk') || '', 10) || undefined,
      goldenVisa: searchParams.get('goldenVisa') === 'true',
      aiStatus: searchParams.get('ai_status') || undefined,
      propertyType: searchParams.get('property_type') || undefined,
      completionStatus: searchParams.get('completion') || undefined,
      page: parseInt(searchParams.get('page') || '1', 10) || 1,
      limit: parseInt(searchParams.get('limit') || '50', 10) || 50,
    }

    const result = await listAiShieldProjects(params)

    return NextResponse.json(
      { success: true, ...result },
      { headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800' } }
    )
  } catch (err) {
    console.error('[GET /api/ai-shield/projects]', err)
    return NextResponse.json({ success: false, message: 'Unable to load AI Shield projects' }, { status: 500 })
  }
}
