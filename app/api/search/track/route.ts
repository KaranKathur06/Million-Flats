import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/search/track
 *
 * Tracks search analytics events:
 *   - search_initiated
 *   - search_result_clicked
 *   - filter_applied
 *   - no_results_found
 *   - suggestion_clicked
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { event, payload, path } = body

        const validEvents = [
            'search_initiated',
            'search_result_clicked',
            'filter_applied',
            'no_results_found',
            'suggestion_clicked',
        ]

        if (!event || !validEvents.includes(event)) {
            return NextResponse.json(
                { success: false, message: 'Invalid event type' },
                { status: 400 }
            )
        }

        // Store in AnalyticsEvent table
        await (prisma as any).analyticsEvent.create({
            data: {
                name: event,
                payload: payload || {},
                path: path || '/search',
            },
        })

        return NextResponse.json({ success: true })
    } catch (err: any) {
        console.error('[POST /api/search/track]', err)
        // Don't fail the user experience for analytics
        return NextResponse.json({ success: true })
    }
}
