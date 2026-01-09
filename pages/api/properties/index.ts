import type { NextApiRequest, NextApiResponse } from 'next'
import { mockProperties, Property } from '@/lib/mockData'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Property[] | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let filtered = [...mockProperties]

    // Filter by location
    if (req.query.location) {
      filtered = filtered.filter(p =>
        p.location.toLowerCase().includes((req.query.location as string).toLowerCase())
      )
    }

    // Filter by type
    if (req.query.type) {
      filtered = filtered.filter(p =>
        p.propertyType.toLowerCase() === (req.query.type as string).toLowerCase()
      )
    }

    // Filter by price range
    if (req.query.minPrice) {
      const minPrice = parseInt(req.query.minPrice as string)
      filtered = filtered.filter(p => p.price >= minPrice)
    }
    if (req.query.maxPrice) {
      const maxPrice = parseInt(req.query.maxPrice as string)
      filtered = filtered.filter(p => p.price <= maxPrice)
    }

    // Filter by bedrooms
    if (req.query.bedrooms) {
      const minBedrooms = parseInt(req.query.bedrooms as string)
      filtered = filtered.filter(p => p.bedrooms >= minBedrooms)
    }

    // Filter by bathrooms
    if (req.query.bathrooms) {
      const minBathrooms = parseInt(req.query.bathrooms as string)
      filtered = filtered.filter(p => p.bathrooms >= minBathrooms)
    }

    // Filter by featured
    if (req.query.featured === 'true') {
      filtered = filtered.filter(p => p.featured)
    }

    // Sort
    const sortBy = req.query.sortBy || 'featured'
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'newest':
        filtered.sort((a, b) => (b.yearBuilt || 0) - (a.yearBuilt || 0))
        break
      case 'featured':
      default:
        filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
        break
    }

    // Limit
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined
    if (limit) {
      filtered = filtered.slice(0, limit)
    }

    res.status(200).json(filtered)
  } catch (error) {
    console.error('Error fetching properties:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

