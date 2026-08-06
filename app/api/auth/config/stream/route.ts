/**
 * GET /api/auth/config/stream
 *
 * Server-Sent Events endpoint for real-time auth config changes.
 * Frontend opens a persistent connection; when admin saves new settings,
 * this stream pushes the update so the UI updates without polling.
 *
 * Heartbeat every 25 seconds to keep connection alive.
 */

import { subscribeToAuthSettingsChanges, getAuthSettings } from '@/lib/auth/auth-settings-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state
      try {
        const initial = await getAuthSettings()
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initial)}\n\n`))
      } catch {
        // Continue even if initial fetch fails
      }

      // Subscribe to changes
      const unsubscribe = subscribeToAuthSettingsChanges((settings) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(settings)}\n\n`))
        } catch {
          // Stream may have closed
        }
      })

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, 25000)

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat)
        unsubscribe()
      }

      // AbortController not directly available in ReadableStream, but
      // the stream will be cancelled when the client disconnects
      ;(controller as any)._cleanup = cleanup
    },
    cancel() {
      // Called when the client disconnects
      if ((this as any)._cleanup) (this as any)._cleanup()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
