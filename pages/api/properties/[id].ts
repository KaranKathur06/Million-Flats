import type { NextApiRequest, NextApiResponse } from 'next'
import { mockProperties, Property } from '@/lib/mockData'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Property | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    const property = mockProperties.find(p => p.id === id)

    if (!property) {
      return res.status(404).json({ error: 'Property not found' })
    }

    res.status(200).json(property)
  } catch (error) {
    console.error('Error fetching property:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

