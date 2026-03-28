/**
 * Analytics Trust Engine — Database Metrics Service
 *
 * Fetches aggregate numbers from PostgreSQL via Prisma.
 * All queries are lightweight COUNT / DISTINCT operations.
 */

import { prisma } from '@/lib/prisma'
import type { DBMetrics } from './types'

export async function getDBMetrics(): Promise<DBMetrics> {
  const [
    totalBlogs,
    totalDevelopers,
    totalAgents,
    citiesResult,
    toursResult,
  ] = await Promise.all([
    // Published blogs / investment guides
    prisma.blog.count({
      where: {
        status: 'PUBLISHED',
        OR: [{ publishAt: null }, { publishAt: { lte: new Date() } }],
      },
    }),

    // Developers
    prisma.developer.count(),

    // Approved agents
    prisma.agent.count({
      where: { approved: true },
    }),

    // Distinct cities from approved manual properties
    prisma.manualProperty.findMany({
      where: {
        status: 'APPROVED',
        city: { not: null },
      },
      select: { city: true },
      distinct: ['city'],
    }),

    // Properties with 3D tours
    prisma.manualProperty.count({
      where: {
        status: 'APPROVED',
        tour3dUrl: { not: null },
      },
    }),
  ])

  return {
    totalBlogs,
    totalCities: citiesResult.length,
    totalDevelopers,
    total3DTours: toursResult,
    totalAgents,
  }
}
