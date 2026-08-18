import { removeEditorialFields, getEditorialFields } from './projectEditGuards'

export type ImportValidationState = 'READY' | 'NEEDS_REVIEW' | 'BLOCKED'
export type ImportSourceProvider = 'SQUAREYARDS' | 'MANUAL' | 'EXTERNAL' | 'UNKNOWN'

export type ProjectImportDeveloper = {
  slug: string
  name: string
}

export type ProjectImportMediaRef = {
  source: string
  sourceUrl: string
  category?: string
  status?: 'REVIEW_REQUIRED' | 'READY' | 'BLOCKED'
}

export type ProjectImportPreviewItem = {
  name: string
  developer: ProjectImportDeveloper | null
  countryIso2: string | null
  city: string | null
  community: string | null
  startingPrice: number | null
  slug?: string | null
  completionYear?: number | null
  overview?: string | null
  description?: string | null
  goldenVisa: boolean
  featured: boolean
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  unitTypes?: any[]
  floorPlans?: any[]
  highlights?: any[]
  amenities?: any[]
  paymentPlans?: any[]
  nearbyPlaces?: any[]
  location?: any
  videos?: any[]
  media?: any[]
  sourceMedia?: ProjectImportMediaRef[]
  needsReview: boolean
  isBlocked: boolean
  validation: {
    errors: string[]
    warnings: string[]
    state: ImportValidationState
  }
  sourceRef?: string | null
  duplicateCandidate?: boolean
}

export type ProjectImportPreviewResult = {
  ok: boolean
  summary: {
    totalProjects: number
    validProjects: number
    warnings: number
    errors: number
    duplicateCandidates: number
    missingDevelopers: number
    unresolvedLocations: number
    sourceMediaReferences: number
  }
  projects: ProjectImportPreviewItem[]
  warnings: string[]
  errors: string[]
}

const SUPPORTED_COUNTRIES = new Set(['IN', 'AE'])
const FALLBACK_COUNTRY = 'IN'

function normalizeText(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ')
}

function normalizeSlug(value: string): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

function normalizeKey(value: string): string {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function parsePriceLike(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value !== 'string') return null

  const raw = value.trim().toUpperCase().replace(/,/g, '')
  if (!raw) return null

  const crore = raw.match(/([\d.]+)\s*(?:CR|CRORE)/)
  if (crore) return Math.round(Number(crore[1]) * 10_000_000)

  const lakh = raw.match(/([\d.]+)\s*(?:L|LAC|LAKH|LAKHS)/)
  if (lakh) return Math.round(Number(lakh[1]) * 100_000)

  const thousand = raw.match(/([\d.]+)\s*(?:K)/)
  if (thousand) return Math.round(Number(thousand[1]) * 1_000)

  const plain = Number(raw.replace(/[^\d.]/g, ''))
  if (Number.isFinite(plain) && plain > 0) return Math.round(plain)
  return null
}

function normalizeLegacyDeveloper(input: unknown): ProjectImportDeveloper | null {
  if (!input || typeof input !== 'object') return null
  const dev = input as Record<string, any>
  const slug = normalizeText(dev.slug || dev.developerSlug || dev.name)
  const name = normalizeText(dev.name || dev.developerName || '')
  if (!slug && !name) return null
  return { slug: slug || normalizeSlug(name) || 'developer', name: name || slug || 'Developer' }
}

function normalizeSquareYardsProject(project: any, index: number): any {
  const developerValue = project.developer ?? project.developerName ?? project.developerSlug ?? 'Unknown Developer'
  const normalizedDeveloper = typeof developerValue === 'string'
    ? { slug: normalizeSlug(developerValue) || `developer-${index + 1}`, name: developerValue.trim() || 'Unknown Developer' }
    : normalizeLegacyDeveloper(developerValue)

  const rawImages = Array.isArray(project.images) ? project.images : []
  const fallbackImage = project.image ? [project.image] : []
  const mediaRefs = [...rawImages, ...fallbackImage].filter((value: unknown) => typeof value === 'string' && value.trim())
    .map((value: string) => ({
      source: 'SQUAREYARDS',
      sourceUrl: value.trim(),
      category: 'GALLERY',
      status: 'REVIEW_REQUIRED',
    }))

  const startingPrice = project.startingPrice ?? project.price ?? project.priceRangeLow ?? project.priceRangeHigh ?? null

  return {
    name: normalizeText(project.name || `Project ${index + 1}`),
    developer: normalizedDeveloper,
    countryIso2: normalizeText(project.countryIso2 || project.country || 'IN').toUpperCase() || 'IN',
    city: normalizeText(project.city || 'Bangalore') || 'Bangalore',
    community: normalizeText(project.community || project.subLocality || project.locality || 'Unknown') || 'Unknown',
    startingPrice: parsePriceLike(startingPrice ?? project.priceText ?? project.priceRangeLow ?? project.priceRangeHigh) ?? null,
    slug: normalizeSlug(project.slug || project.name || `project-${index + 1}`),
    description: normalizeText(project.description || project.overview || ''),
    overview: normalizeText(project.description || project.overview || ''),
    completionYear: project.completionYear ?? null,
    goldenVisa: Boolean(project.goldenVisa),
    featured: Boolean(project.featured),
    status: 'DRAFT',
    sourceMedia: mediaRefs,
    media: mediaRefs,
    sourceUrl: normalizeText(project.sourceUrl || project.url || ''),
    location: project.location || null,
    highlights: Array.isArray(project.highlights) ? project.highlights : [],
    amenities: Array.isArray(project.amenities) ? project.amenities : [],
    paymentPlans: Array.isArray(project.paymentPlans) ? project.paymentPlans : [],
    nearbyPlaces: Array.isArray(project.nearbyPlaces) ? project.nearbyPlaces : [],
    videos: Array.isArray(project.videos) ? project.videos : [],
    unitTypes: Array.isArray(project.unitTypes) ? project.unitTypes : [],
    floorPlans: Array.isArray(project.floorPlans) ? project.floorPlans : [],
  }
}

function normalizeLegacyEnvelope(payload: unknown): any {
  if (!payload || typeof payload !== 'object') {
    return { schemaVersion: '2.0', importType: 'PROJECTS', source: { provider: 'UNKNOWN' }, projects: [] }
  }

  const root = payload as Record<string, any>

  if (Array.isArray(root)) {
    return {
      schemaVersion: '2.0',
      importType: 'PROJECTS',
      source: {
        provider: 'SQUAREYARDS',
        sourceUrl: null,
        scrapedAt: new Date().toISOString(),
      },
      projects: root.map((project: any, index: number) => normalizeSquareYardsProject(project, index)),
    }
  }

  const rawProjects = Array.isArray(root.projects) ? root.projects : []

  if (root.developerSlug || root.developerName || rawProjects.length) {
    const developer = normalizeLegacyDeveloper({ slug: root.developerSlug, name: root.developerName })
    return {
      schemaVersion: '2.0',
      importType: 'PROJECTS',
      source: {
        provider: root.sourceProvider || root.provider || 'MANUAL',
        sourceUrl: root.sourceUrl || null,
        scrapedAt: root.scrapedAt || new Date().toISOString(),
      },
      projects: rawProjects.map((project: any) => ({
        ...project,
        developer: project.developer ?? developer,
      })),
    }
  }

  if (Array.isArray(payload)) {
    return {
      schemaVersion: '2.0',
      importType: 'PROJECTS',
      source: { provider: 'SQUAREYARDS', sourceUrl: null, scrapedAt: new Date().toISOString() },
      projects: payload.map((project: any, index: number) => normalizeSquareYardsProject(project, index)),
    }
  }

  return root
}

export function buildProjectImportPreview(payload: unknown): ProjectImportPreviewResult {
  const envelope = normalizeLegacyEnvelope(payload)
  const source = envelope.source || { provider: 'UNKNOWN', sourceUrl: null, scrapedAt: null }
  const rawProjects = Array.isArray(envelope.projects) ? envelope.projects : []

  const warnings: string[] = []
  const errors: string[] = []
  const previewProjects: ProjectImportPreviewItem[] = []
  const seen = new Map<string, number>()
  let duplicateCandidates = 0
  let missingDevelopers = 0
  let unresolvedLocations = 0
  let sourceMediaReferences = 0

  for (const rawProject of rawProjects) {
    const project = rawProject && typeof rawProject === 'object' ? rawProject as Record<string, any> : {}
    const name = normalizeText(project.name)
    const developer = project.developer === null ? null : normalizeLegacyDeveloper(project.developer)
    const countryIso2 = normalizeText(project.countryIso2).toUpperCase() || null
    const city = normalizeText(project.city) || null
    const community = normalizeText(project.community) || null
    const status = normalizeText(project.status || 'DRAFT').toUpperCase()
    const startingPrice = parsePriceLike(project.startingPrice)
    const sourceMedia = Array.isArray(project.sourceMedia) ? project.sourceMedia.map((media: any) => ({
      source: normalizeText(media.source || 'SQUAREYARDS') || 'SQUAREYARDS',
      sourceUrl: normalizeText(media.sourceUrl || media.url || ''),
      category: normalizeText(media.category || 'GALLERY') || 'GALLERY',
      status: media.status || 'REVIEW_REQUIRED',
    })) : []

    let projectWarnings: string[] = []
    let projectErrors: string[] = []

    if (!name) projectErrors.push('MISSING_PROJECT_NAME')
    if (!developer || !developer.slug || !developer.name) {
      projectErrors.push('DEVELOPER_NOT_FOUND')
      missingDevelopers += 1
    }
    if (!countryIso2) {
      projectErrors.push('MISSING_COUNTRY')
    } else if (!SUPPORTED_COUNTRIES.has(countryIso2)) {
      projectErrors.push('UNSUPPORTED_COUNTRY')
    }
    if (!city) projectErrors.push('MISSING_CITY')
    if (!community) projectErrors.push('MISSING_COMMUNITY')
    if (project.startingPrice !== undefined && project.startingPrice !== null && startingPrice === null) {
      projectErrors.push('INVALID_STARTING_PRICE')
    }
    if (project.status === 'PUBLISHED' || project.status === 'ARCHIVED') {
      projectWarnings.push('EXTERNAL_IMPORT_STATUS_RESET_TO_DRAFT')
    }
    if (project.featured === true) projectWarnings.push('FEATURED_FLAG_RESET_TO_FALSE')
    if (project.goldenVisa === true) projectWarnings.push('GOLDEN_VISA_REQUIRES_VERIFICATION')
    if (project.sourceMedia && sourceMedia.length > 0) {
      sourceMediaReferences += sourceMedia.length
      projectWarnings.push('SOURCE_MEDIA_REQUIRES_REVIEW')
    }
    if (project.location && project.location.latitude !== undefined && project.location.longitude !== undefined && (!project.location.latitude || !project.location.longitude)) {
      projectWarnings.push('LOCATION_COORDINATES_INCOMPLETE')
    }
    if (project.location && project.location.address && !project.location.latitude && !project.location.longitude) {
      projectWarnings.push('LOCATION_COORDINATES_MISSING')
    }
    if (!project.completionYear) projectWarnings.push('MISSING_COMPLETION_YEAR')
    if (!project.description && !project.overview) projectWarnings.push('MISSING_DESCRIPTION')
    if (!project.unitTypes || !project.unitTypes.length) projectWarnings.push('MISSING_UNIT_TYPES')
    if (!project.media || !project.media.length) projectWarnings.push('MISSING_MEDIA')

    const duplicateKey = normalizeKey(`${name}|${developer?.slug || 'unknown'}|${countryIso2 || FALLBACK_COUNTRY}|${city || 'unknown'}|${community || 'unknown'}`)
    if (seen.has(duplicateKey)) {
      duplicateCandidates += 1
      projectErrors.push('DUPLICATE_CANDIDATE')
    }
    seen.set(duplicateKey, 1)

    if (!countryIso2 || !city || !community) unresolvedLocations += 1

    const validStatus = projectErrors.length === 0 ? 'READY' : 'NEEDS_REVIEW'
    const needsReview = projectErrors.length > 0 || projectWarnings.length > 0
    const isBlocked = projectErrors.some((err) => ['MISSING_PROJECT_NAME','MISSING_COUNTRY','MISSING_CITY','MISSING_COMMUNITY','DEVELOPER_NOT_FOUND','UNSUPPORTED_COUNTRY','INVALID_STARTING_PRICE','DUPLICATE_CANDIDATE'].includes(err))

    const previewProject: ProjectImportPreviewItem = {
      name,
      developer,
      countryIso2: countryIso2 || null,
      city,
      community,
      startingPrice,
      slug: normalizeSlug(project.slug || name || 'project') || null,
      completionYear: project.completionYear ?? null,
      overview: normalizeText(project.overview) || null,
      description: normalizeText(project.description) || null,
      goldenVisa: Boolean(project.goldenVisa),
      featured: Boolean(project.featured),
      status: (['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status) ? status : 'DRAFT') as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
      unitTypes: Array.isArray(project.unitTypes) ? project.unitTypes : [],
      floorPlans: Array.isArray(project.floorPlans) ? project.floorPlans : [],
      highlights: Array.isArray(project.highlights) ? project.highlights : [],
      amenities: Array.isArray(project.amenities) ? project.amenities : [],
      paymentPlans: Array.isArray(project.paymentPlans) ? project.paymentPlans : [],
      nearbyPlaces: Array.isArray(project.nearbyPlaces) ? project.nearbyPlaces : [],
      location: project.location || null,
      videos: Array.isArray(project.videos) ? project.videos : [],
      media: Array.isArray(project.media) ? project.media : [],
      sourceMedia,
      sourceRef: normalizeText(source.sourceUrl || source.provider || ''),
      needsReview,
      isBlocked,
      duplicateCandidate: projectErrors.includes('DUPLICATE_CANDIDATE'),
      validation: {
        errors: Array.from(new Set(projectErrors)),
        warnings: Array.from(new Set(projectWarnings)),
        state: validStatus as ImportValidationState,
      },
    }

    previewProjects.push(previewProject)
    if (previewProject.validation.errors.length > 0) {
      errors.push(`${previewProject.name || 'Unnamed project'}: ${previewProject.validation.errors.join(', ')}`)
    }
    if (previewProject.validation.warnings.length > 0) {
      warnings.push(`${previewProject.name || 'Unnamed project'}: ${previewProject.validation.warnings.join(', ')}`)
    }
  }

  const validProjects = previewProjects.filter((project) => project.validation.errors.length === 0).length

  return {
    ok: previewProjects.length > 0 && validProjects === previewProjects.length,
    summary: {
      totalProjects: previewProjects.length,
      validProjects,
      warnings: warnings.length,
      errors: errors.length,
      duplicateCandidates,
      missingDevelopers,
      unresolvedLocations,
      sourceMediaReferences,
    },
    projects: previewProjects,
    warnings,
    errors,
  }
}

export function normalizeProjectImportPayload(payload: unknown): any {
  const result = buildProjectImportPreview(payload)
  return {
    schemaVersion: '2.0',
    importType: 'PROJECTS',
    source: { provider: 'SQUAREYARDS', sourceUrl: null, scrapedAt: new Date().toISOString() },
    projects: result.projects.map((project) => ({
      name: project.name,
      developer: project.developer,
      countryIso2: project.countryIso2,
      city: project.city,
      community: project.community,
      startingPrice: project.startingPrice,
      slug: project.slug,
      completionYear: project.completionYear,
      overview: project.overview,
      description: project.description,
      goldenVisa: project.goldenVisa,
      featured: project.featured,
      status: project.status,
      unitTypes: project.unitTypes,
      floorPlans: project.floorPlans,
      highlights: project.highlights,
      amenities: project.amenities,
      paymentPlans: project.paymentPlans,
      nearbyPlaces: project.nearbyPlaces,
      location: project.location,
      videos: project.videos,
      media: project.media,
      sourceMedia: project.sourceMedia,
      validation: project.validation,
    })),
    summary: result.summary,
  }
}

export function buildCanonicalProjectCreatePayload(payload: unknown): any[] {
  const envelope = normalizeLegacyEnvelope(payload)
  const rawProjects = Array.isArray(envelope.projects) ? envelope.projects : []
  const preview = buildProjectImportPreview(envelope)

  return preview.projects
    .filter((project) => project.validation.errors.length === 0)
    .map((project) => {
      const sourceProject = rawProjects.find((candidate: any) => {
        const nameMatch = normalizeText(candidate.name || '') === normalizeText(project.name)
        const developerMatch = normalizeText(candidate.developer?.slug || candidate.developer?.name || '') === normalizeText(project.developer?.slug || project.developer?.name || '')
        return nameMatch && developerMatch
      }) || {}

      const firstMedia = Array.isArray(project.media) && project.media.length > 0
        ? (project.media[0]?.mediaUrl || project.media[0]?.url || project.media[0]?.sourceUrl || null)
        : null

      const canonicalProject = {
        name: project.name,
        slug: project.slug || normalizeSlug(project.name || 'project'),
        developer: project.developer,
        developerId: null,
        countryIso2: project.countryIso2 || 'IN',
        city: project.city || null,
        community: project.community || null,
        description: project.description || project.overview || null,
        overview: project.overview || project.description || null,
        completionYear: project.completionYear ?? null,
        startingPrice: project.startingPrice ?? null,
        goldenVisa: Boolean(project.goldenVisa),
        isFeatured: Boolean(project.featured),
        featuredOrder: project.featured ? 0 : null,
        coverImage: sourceProject.coverImage || sourceProject.media?.hero || firstMedia || null,
        status: 'DRAFT',
        highlights: Array.isArray(project.highlights) ? project.highlights : Array.isArray(sourceProject.highlights) ? sourceProject.highlights : [],
        amenities: Array.isArray(project.amenities) ? project.amenities : Array.isArray(sourceProject.amenities) ? sourceProject.amenities : [],
        paymentPlans: Array.isArray(project.paymentPlans) ? project.paymentPlans : Array.isArray(sourceProject.paymentPlans) ? sourceProject.paymentPlans : [],
        nearbyPlaces: Array.isArray(project.nearbyPlaces) ? project.nearbyPlaces : Array.isArray(sourceProject.nearbyPlaces) ? sourceProject.nearbyPlaces : [],
        location: project.location || sourceProject.location || null,
        videos: Array.isArray(project.videos) ? project.videos : Array.isArray(sourceProject.videos) ? sourceProject.videos : [],
        unitTypes: Array.isArray(project.unitTypes) ? project.unitTypes : Array.isArray(sourceProject.unitTypes) ? sourceProject.unitTypes : [],
        floorPlans: Array.isArray(project.floorPlans) ? project.floorPlans : Array.isArray(sourceProject.floorPlans) ? sourceProject.floorPlans : [],
        sourceMedia: Array.isArray(project.sourceMedia) ? project.sourceMedia : Array.isArray(sourceProject.sourceMedia) ? sourceProject.sourceMedia : [],
        sourceRef: project.sourceRef || sourceProject.sourceUrl || null,
      }

      // CRITICAL: Remove editorial fields to prevent scrapers/imports from overwriting admin-set priorities
      const safeProject = removeEditorialFields(canonicalProject)
      
      // Log if any editorial fields were unexpectedly present (for audit trail)
      const editorialAttempted = getEditorialFields(canonicalProject)
      if (Object.keys(editorialAttempted).length > 0) {
        console.warn(
          `[projectImportV2] Stripped editorial fields from project "${project.name}": ${Object.keys(editorialAttempted).join(', ')}`
        )
      }

      return safeProject
    })
}
