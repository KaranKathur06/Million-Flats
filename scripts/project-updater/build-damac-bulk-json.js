const fs = require('fs')
const path = require('path')

function parsePriceToNumber(input) {
    if (typeof input === 'number' && Number.isFinite(input)) return input
    if (typeof input !== 'string') return null

    const raw = input.trim().toUpperCase()
    if (!raw) return null

    const numeric = parseFloat(raw.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(numeric)) return null

    if (raw.includes('B')) return numeric * 1_000_000_000
    if (raw.includes('M')) return numeric * 1_000_000
    if (raw.includes('K')) return numeric * 1_000
    return numeric
}

function cleanText(input) {
    if (typeof input !== 'string') return input
    return input
        .replace(/â€“/g, '-')
        .replace(/â€”/g, '-')
        .replace(/â€™/g, "'")
        .replace(/â€œ/g, '"')
        .replace(/â€/g, '"')
        .replace(/\u2013/g, '-')
        .replace(/\u2014/g, '-')
        .replace(/\u2019/g, "'")
}

function extractYearFromText(input) {
    if (typeof input !== 'string') return null
    const match = input.match(/\b(20\d{2})\b/)
    if (!match) return null
    const year = Number(match[1])
    if (!Number.isInteger(year) || year < 2000 || year > 2100) return null
    return year
}

function normalizeBaseProject(p) {
    return {
        name: cleanText(p.name),
        slug: cleanText(p.slug),
        city: cleanText(p.city) || 'Dubai',
        community: cleanText(p.community) || null,
        countryIso2: p.countryIso2 || 'AE',
        goldenVisa: typeof p.goldenVisa === 'boolean' ? p.goldenVisa : true,
        completionYear: p.completionYear ?? null,
        startingPrice: p.startingPrice ?? null,
        status: p.status || 'PUBLISHED',
        description: cleanText(p.description) || `${cleanText(p.name)} is a premium off-plan development by DAMAC in ${cleanText(p.community) || cleanText(p.city) || 'Dubai'}.`,
        highlights: Array.isArray(p.highlights) ? p.highlights.map(cleanText) : [],
        coverImage: cleanText(p.coverImage) || null,
        amenities: Array.isArray(p.amenities) ? p.amenities.map(cleanText) : [],
        paymentPlans: Array.isArray(p.paymentPlans) ? p.paymentPlans : [],
        unitTypes: Array.isArray(p.unitTypes) ? p.unitTypes : [],
        floorPlans: Array.isArray(p.floorPlans) ? p.floorPlans : [],
        nearbyPlaces: Array.isArray(p.nearbyPlaces) ? p.nearbyPlaces : [],
        locationAddress: cleanText(p.locationAddress) || null,
    }
}

function buildUnitTypesFromLegacy(unitTypes, startingPrices) {
    if (!Array.isArray(unitTypes)) return []
    return unitTypes
        .map((unitType) => {
            if (typeof unitType !== 'string' || !unitType.trim()) return null
            const type = cleanText(unitType.trim())
            const priceKey = Object.keys(startingPrices || {}).find((k) => {
                const a = k.toLowerCase().replace(/\s+/g, '')
                const b = type.toLowerCase().replace(/\s+/g, '')
                return a.includes(b) || b.includes(a) || (a.includes('br') && b.includes(a.replace('br', ' bedroom')))
            })
            const priceFrom = priceKey ? parsePriceToNumber(startingPrices[priceKey]) : null
            return {
                unitType: type,
                sizeFrom: null,
                sizeTo: null,
                priceFrom,
            }
        })
        .filter(Boolean)
}

function buildPaymentPlansFromLegacy(paymentPlan) {
    if (!paymentPlan || typeof paymentPlan !== 'object') return []
    return Object.entries(paymentPlan)
        .map(([stage, pct], idx) => {
            const percentage = parsePriceToNumber(pct)
            if (percentage === null) return null
            return {
                stage: stage.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim(),
                percentage,
                milestone: null,
                sortOrder: idx,
            }
        })
        .filter(Boolean)
}

function buildNearbyPlacesFromLegacy(connectivity) {
    if (!Array.isArray(connectivity)) return []
    return connectivity
        .map((c) => {
            if (!c || typeof c !== 'object' || !c.place) return null
            return {
                name: cleanText(c.place),
                category: null,
                distance: cleanText(c.time) || null,
            }
        })
        .filter(Boolean)
}

function normalizeMedia(media) {
    if (!media || typeof media !== 'object') return undefined
    return {
        hero: cleanText(media.hero) || undefined,
        featured: Array.isArray(media.featured) ? media.featured.map(cleanText).filter(Boolean) : [],
        tabs: {
            exterior: Array.isArray(media.tabs?.exterior) ? media.tabs.exterior.map(cleanText).filter(Boolean) : [],
            amenities: Array.isArray(media.tabs?.amenities) ? media.tabs.amenities.map(cleanText).filter(Boolean) : [],
            interiors: Array.isArray(media.tabs?.interiors) ? media.tabs.interiors.map(cleanText).filter(Boolean) : [],
            lifestyle: Array.isArray(media.tabs?.lifestyle) ? media.tabs.lifestyle.map(cleanText).filter(Boolean) : [],
        },
    }
}

function mergeLegacyProject(baseProject, legacyProject) {
    const unitTypes = buildUnitTypesFromLegacy(legacyProject.unitTypes, legacyProject.startingPrices)
    const paymentPlans = buildPaymentPlansFromLegacy(legacyProject.paymentPlan)
    const nearbyPlaces = buildNearbyPlacesFromLegacy(legacyProject.connectivity)
    const completionYear = extractYearFromText(legacyProject.handover)

    const priceCandidates = Object.values(legacyProject.startingPrices || {})
        .map((v) => parsePriceToNumber(v))
        .filter((n) => typeof n === 'number')
    const minPrice = priceCandidates.length > 0 ? Math.min(...priceCandidates) : null

    return {
        ...baseProject,
        name: legacyProject.name && legacyProject.name !== legacyProject.slug ? cleanText(legacyProject.name) : baseProject.name,
        city: baseProject.city || 'Dubai',
        community: baseProject.community || cleanText(legacyProject.location) || null,
        description: cleanText(legacyProject.description) || baseProject.description,
        highlights: Array.isArray(legacyProject.highlights)
            ? legacyProject.highlights.map(cleanText)
            : (Array.isArray(legacyProject.ecoConcept) ? legacyProject.ecoConcept.map(cleanText) : baseProject.highlights),
        coverImage: cleanText(legacyProject.media?.hero) || baseProject.coverImage || null,
        startingPrice: minPrice ?? baseProject.startingPrice ?? null,
        completionYear: completionYear ?? baseProject.completionYear ?? null,
        locationAddress: cleanText(legacyProject.location) || baseProject.locationAddress || null,
        amenities: Array.isArray(legacyProject.amenities) ? legacyProject.amenities.map(cleanText) : baseProject.amenities,
        paymentPlans: paymentPlans.length > 0 ? paymentPlans : baseProject.paymentPlans,
        unitTypes: unitTypes.length > 0 ? unitTypes : baseProject.unitTypes,
        nearbyPlaces: nearbyPlaces.length > 0 ? nearbyPlaces : baseProject.nearbyPlaces,
        media: normalizeMedia(legacyProject.media) || baseProject.media || undefined,
        brochure: legacyProject.brochure
            ? {
                title: cleanText(legacyProject.brochure.title) || null,
                file: cleanText(legacyProject.brochure.file) || null,
            }
            : undefined,
    }
}

function run() {
    const root = path.resolve(__dirname, '..', '..')
    const damacJsonPath = path.join(root, 'damac_projects.json')
    const chelseaPath = path.join(__dirname, 'data', 'chelsea-residences.json')
    const islandsPath = path.join(__dirname, 'data', 'damac-islands-2.json')

    const base = JSON.parse(fs.readFileSync(damacJsonPath, 'utf8'))
    const chelseaLegacy = JSON.parse(fs.readFileSync(chelseaPath, 'utf8'))
    const islandsLegacy = JSON.parse(fs.readFileSync(islandsPath, 'utf8'))

    const normalized = (base.projects || []).map((p) => normalizeBaseProject(p))
    const bySlug = new Map(normalized.map((p) => [p.slug, p]))

    if (bySlug.has('chelsea-residences')) {
        bySlug.set('chelsea-residences', mergeLegacyProject(bySlug.get('chelsea-residences'), chelseaLegacy))
    }
    if (bySlug.has('damac-islands-2')) {
        bySlug.set('damac-islands-2', mergeLegacyProject(bySlug.get('damac-islands-2'), islandsLegacy))
    }

    const output = {
        developerSlug: base.developerSlug || 'damac',
        developerName: base.developerName || 'DAMAC Properties',
        projects: (base.projects || []).map((p) => bySlug.get(p.slug)),
    }

    fs.writeFileSync(damacJsonPath, JSON.stringify(output, null, 2) + '\n', 'utf8')
    console.log(`Updated ${damacJsonPath} with ${output.projects.length} projects.`)
}

run()
