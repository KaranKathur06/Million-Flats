import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAgentSession } from '@/lib/agentAuth'

export const runtime = 'nodejs'

const QuerySchema = z.object({ query: z.string().trim().min(3).max(200) })

export async function GET(req: Request) {
  const auth = await requireAgentSession()
  if (!auth.ok) return NextResponse.json({ success: false, message: auth.message }, { status: auth.status })
  const query = QuerySchema.safeParse({ query: new URL(req.url).searchParams.get('query') || '' })
  if (!query.success) return NextResponse.json({ success: false, message: 'Enter at least 3 characters' }, { status: 400 })

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=in,ae&q=${encodeURIComponent(query.data.query)}`, {
      headers: { 'User-Agent': 'MillionFlats property listing location search' },
      next: { revalidate: 300 },
    })
    if (!response.ok) return NextResponse.json({ success: false, message: 'Location search is temporarily unavailable' }, { status: 502 })
    const results = await response.json()
    return NextResponse.json({ success: true, results: Array.isArray(results) ? results.map((item: any) => ({ displayName: String(item.display_name || ''), latitude: Number(item.lat), longitude: Number(item.lon), type: String(item.type || '') })) : [] })
  } catch (error) {
    console.error('Manual property geocode failed', error)
    return NextResponse.json({ success: false, message: 'Location search is temporarily unavailable' }, { status: 502 })
  }
}
