/**
 * Ownership resolution: Map scraped/imported properties to MillionFlats Agents.
 * Uses multiple signal strategies: explicit agentId, city matching, locality matching,
 * and property-agent type compatibility.
 */

import { prisma } from '@/lib/prisma'

export interface OwnershipSignal {
  type: 'explicit_id' | 'city_match' | 'locality_match' | 'geo_proximity' | 'agent_specialization'
  confidence: number
  agentId: string
  reason: string
}

export interface OwnershipResolution {
  resolved: boolean
  agentId: string | null
  confidence: number
  signals: OwnershipSignal[]
  warnings: string[]
  requiresManualReview: boolean
  reason: string
}

export interface OwnershipResolutionInput {
  agentId?: string | null
  city?: string | null
  locality?: string | null
  latitude?: number | null
  longitude?: number | null
  propertyType?: string | null
  price?: number | null
  sourceProvider?: string | null
  countryCode?: string | null
}

const SUPPORTED_SOURCES = ['squareyards', '99acres', 'reelly']
const APPROVED_AGENT_STATUSES = ['APPROVED', 'EMAIL_VERIFIED', 'PROFILE_COMPLETED', 'DOCUMENTS_UPLOADED']

/**
 * Calculate distance between two lat/lon coordinates (in km)
 * Uses Haversine formula for great-circle distance
 */
function geoDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Calculate geo proximity confidence based on distance
 * 0-5km: 0.95
 * 5-10km: 0.85
 * 10-25km: 0.70
 * 25-50km: 0.50
 */
function geoProximityConfidence(distanceKm: number): number {
  if (distanceKm <= 5) return 0.95
  if (distanceKm <= 10) return 0.85
  if (distanceKm <= 25) return 0.7
  if (distanceKm <= 50) return 0.5
  return 0
}

/**
 * Check if source provider is authorized for this import
 */
function isSourceAuthorized(source: string | undefined | null): boolean {
  if (!source) return false
  return SUPPORTED_SOURCES.includes(source.toLowerCase())
}

/**
 * Validate agent status is appropriate for accepting imports
 */
function isAgentApproved(status: string | null | undefined): boolean {
  if (!status) return false
  return APPROVED_AGENT_STATUSES.includes(status)
}

export async function resolveOwnership(input: OwnershipResolutionInput): Promise<OwnershipResolution> {
  const signals: OwnershipSignal[] = []
  const warnings: string[] = []

  // Validate source authorization
  if (input.sourceProvider && !isSourceAuthorized(input.sourceProvider)) {
    return {
      resolved: false,
      agentId: null,
      confidence: 0,
      signals: [],
      warnings: [`Source '${input.sourceProvider}' is not authorized for bulk imports`],
      requiresManualReview: true,
      reason: 'Unauthorized source provider',
    }
  }

  // Strategy 1: Explicit agentId in source data
  if (input.agentId && typeof input.agentId === 'string' && input.agentId.trim()) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: input.agentId },
        select: { id: true, status: true, approved: true },
      })

      if (!agent) {
        warnings.push(`Explicit agentId '${input.agentId}' not found in system`)
      } else if (!isAgentApproved(agent.status)) {
        warnings.push(`Agent '${input.agentId}' has status '${agent.status}' (not approved)`)
      } else {
        signals.push({
          type: 'explicit_id',
          confidence: 0.99,
          agentId: input.agentId,
          reason: 'Explicit agentId provided in source data',
        })
        return {
          resolved: true,
          agentId: input.agentId,
          confidence: 0.99,
          signals,
          warnings,
          requiresManualReview: false,
          reason: 'Explicit agentId validation successful',
        }
      }
    } catch (error) {
      warnings.push(`Error validating explicit agentId: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Strategy 2: City + Locality matching via AgentServiceArea
  if (input.city) {
    const city = input.city.trim()

    try {
      const serviceAreaQuery = await prisma.agentServiceArea.findMany({
        where: {
          city: {
            equals: city,
            mode: 'insensitive',
          },
          ...(input.locality && {
            OR: [
              { locality: null }, // Agents serving entire city
              { locality: { equals: input.locality, mode: 'insensitive' } }, // Specific locality
            ],
          }),
        },
        select: {
          agentId: true,
          locality: true,
          latitude: true,
          longitude: true,
          agent: {
            select: {
              id: true,
              status: true,
              approved: true,
            },
          },
        },
        take: 50, // Limit to avoid huge result sets
      })

      if (serviceAreaQuery.length > 0) {
        // Filter for approved agents
        const approvedAreas = serviceAreaQuery.filter((area) => isAgentApproved(area.agent.status))

        if (approvedAreas.length > 0) {
          // Prefer exact locality match if available
          const localityMatch = approvedAreas.find(
            (area) => area.locality && input.locality && area.locality.toLowerCase() === input.locality.toLowerCase(),
          )

          if (localityMatch) {
            signals.push({
              type: 'locality_match',
              confidence: 0.92,
              agentId: localityMatch.agentId,
              reason: `Agent serves '${input.locality}' in '${city}'`,
            })
            return {
              resolved: true,
              agentId: localityMatch.agentId,
              confidence: 0.92,
              signals,
              warnings,
              requiresManualReview: false,
              reason: 'City + Locality match via AgentServiceArea',
            }
          }

          // Fall back to city-wide match
          const cityWideMatch = approvedAreas.find((area) => !area.locality)
          if (cityWideMatch) {
            signals.push({
              type: 'city_match',
              confidence: 0.80,
              agentId: cityWideMatch.agentId,
              reason: `Agent serves entire city of '${city}'`,
            })
            return {
              resolved: true,
              agentId: cityWideMatch.agentId,
              confidence: 0.80,
              signals,
              warnings,
              requiresManualReview: false,
              reason: 'City-wide match via AgentServiceArea',
            }
          }

          // Multiple approved agents in this area - gather signals
          for (const area of approvedAreas.slice(0, 5)) {
            signals.push({
              type: 'city_match',
              confidence: 0.75,
              agentId: area.agentId,
              reason: `Agent operates in '${city}' area`,
            })
          }
        } else if (serviceAreaQuery.length > 0) {
          warnings.push(`Found ${serviceAreaQuery.length} agents in '${city}' but none are approved`)
        }
      } else {
        warnings.push(`No agents found with service area in '${city}'`)
      }
    } catch (error) {
      warnings.push(`Error querying service areas: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Strategy 3: Geo-proximity matching (if coordinates available)
  if (input.latitude !== null && input.latitude !== undefined && input.longitude !== null && input.longitude !== undefined) {
    try {
      const nearbyAreas = await prisma.agentServiceArea.findMany({
        where: {
          latitude: { not: null },
          longitude: { not: null },
          agent: {
            status: { in: APPROVED_AGENT_STATUSES as any },
          },
        },
        select: {
          agentId: true,
          latitude: true,
          longitude: true,
          city: true,
          locality: true,
          agent: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        take: 100,
      })

      const proximityMatches = nearbyAreas
        .map((area) => {
          if (area.latitude === null || area.longitude === null) return null
          const distance = geoDistance(input.latitude!, input.longitude!, area.latitude, area.longitude)
          const confidence = geoProximityConfidence(distance)
          return { agentId: area.agentId, distance, confidence, area }
        })
        .filter((m) => m !== null && m.confidence > 0.3)
        .sort((a, b) => (b?.confidence ?? 0) - (a?.confidence ?? 0))
        .slice(0, 5)

      for (const match of proximityMatches) {
        if (match) {
          signals.push({
            type: 'geo_proximity',
            confidence: match.confidence,
            agentId: match.agentId,
            reason: `Agent operates ${Math.round(match.distance)}km away (${match.area.city}/${match.area.locality || 'city-wide'})`,
          })
        }
      }
    } catch (error) {
      warnings.push(`Error querying geo-proximity: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Strategy 4: Agent specialization matching (if available)
  if (input.propertyType && input.price) {
    try {
      const specializations = await prisma.agentSpecialization.findMany({
        where: {
          agent: {
            status: { in: APPROVED_AGENT_STATUSES as any },
          },
        },
        select: {
          agentId: true,
          specialization: true,
          agent: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      })

      const propertyType = input.propertyType.toLowerCase()
      const matchingSpecs = specializations.filter((spec) =>
        spec.specialization.toLowerCase().includes(propertyType),
      )

      for (const spec of matchingSpecs.slice(0, 3)) {
        signals.push({
          type: 'agent_specialization',
          confidence: 0.65,
          agentId: spec.agentId,
          reason: `Agent specializes in '${input.propertyType}' properties`,
        })
      }
    } catch (error) {
      warnings.push(`Error querying specializations: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Resolution logic: Pick best signal or flag for manual review
  if (signals.length === 0) {
    return {
      resolved: false,
      agentId: null,
      confidence: 0,
      signals: [],
      warnings,
      requiresManualReview: true,
      reason: 'No matching agents found via any discovery signal',
    }
  }

  // Sort signals by confidence descending
  const sortedSignals = [...signals].sort((a, b) => b.confidence - a.confidence)
  const bestSignal = sortedSignals[0]

  // If best signal is high confidence and type is strong (explicit/locality), resolve directly
  if (bestSignal.confidence >= 0.90 && ['explicit_id', 'locality_match'].includes(bestSignal.type)) {
    return {
      resolved: true,
      agentId: bestSignal.agentId,
      confidence: bestSignal.confidence,
      signals: sortedSignals,
      warnings,
      requiresManualReview: false,
      reason: `High-confidence match: ${bestSignal.reason}`,
    }
  }

  // If best signal is city-level match with acceptable confidence
  if (bestSignal.confidence >= 0.80 && bestSignal.type === 'city_match') {
    return {
      resolved: true,
      agentId: bestSignal.agentId,
      confidence: bestSignal.confidence,
      signals: sortedSignals,
      warnings,
      requiresManualReview: false,
      reason: `City-level match: ${bestSignal.reason}`,
    }
  }

  // If we have a geo-proximity match within 25km with multiple candidates
  const geoMatches = sortedSignals.filter((s) => s.type === 'geo_proximity' && s.confidence >= 0.5)
  if (geoMatches.length > 0) {
    return {
      resolved: true,
      agentId: geoMatches[0].agentId,
      confidence: geoMatches[0].confidence,
      signals: sortedSignals,
      warnings,
      requiresManualReview: geoMatches.length > 1, // Flag for review if multiple candidates
      reason: `Geo-proximity match: ${geoMatches[0].reason}`,
    }
  }

  // Multiple weak signals - require manual review
  if (signals.length > 1) {
    return {
      resolved: false,
      agentId: null,
      confidence: sortedSignals[0].confidence,
      signals: sortedSignals,
      warnings: [...warnings, 'Multiple agents found but no clear best match'],
      requiresManualReview: true,
      reason: 'Multiple candidate agents with similar confidence',
    }
  }

  // Single weak signal - could resolve with warning
  if (bestSignal.confidence >= 0.65) {
    return {
      resolved: true,
      agentId: bestSignal.agentId,
      confidence: bestSignal.confidence,
      signals: sortedSignals,
      warnings: [...warnings, `Using low-confidence signal (${Math.round(bestSignal.confidence * 100)}%): ${bestSignal.reason}`],
      requiresManualReview: true,
      reason: 'Low-confidence match - recommend manual verification',
    }
  }

  return {
    resolved: false,
    agentId: null,
    confidence: bestSignal.confidence,
    signals: sortedSignals,
    warnings: [...warnings, 'Best signal below confidence threshold'],
    requiresManualReview: true,
    reason: 'No high-confidence agent match available',
  }
}

/**
 * Validate that agent is still approved (for use during commit phase)
 */
export async function validateAgentIsApproved(agentId: string): Promise<{ valid: boolean; reason: string }> {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, status: true, approved: true },
    })

    if (!agent) {
      return { valid: false, reason: `Agent '${agentId}' not found` }
    }

    if (!isAgentApproved(agent.status)) {
      return { valid: false, reason: `Agent status is '${agent.status}' (not approved)` }
    }

    return { valid: true, reason: 'Agent is approved and active' }
  } catch (error) {
    return { valid: false, reason: `Error validating agent: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}
