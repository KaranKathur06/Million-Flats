import type { NextApiRequest, NextApiResponse } from 'next'
import { reellyGetProject } from '@/lib/reelly'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    const pid = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : ''
    if (!pid) {
      return res.status(400).json({ error: 'missing_id' })
    }

    const item = await reellyGetProject<any>(pid)
    return res.status(200).json({ item, raw: item })
  } catch (error) {
    console.error('Error fetching property:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return res.status(502).json({ error: 'reelly_failed', message })
  }
}

