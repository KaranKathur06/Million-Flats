/**
 * Migration Script: damac_projects.json → Database
 * 
 * Reads the static JSON file and inserts/updates projects into the database
 * using the existing Prisma schema. Maps highlights, amenities, nearbyPlaces,
 * paymentPlans, unitTypes, and media.
 * 
 * Usage: node scripts/migrateProjectsJson.js
 */
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
    const jsonPath = path.join(__dirname, '..', 'damac_projects.json')
    if (!fs.existsSync(jsonPath)) {
        console.error('❌ damac_projects.json not found')
        process.exit(1)
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'))
    const developerSlug = data.developerSlug
    const developerName = data.developerName
    const projects = data.projects || []

    console.log(`\n📦 Loaded ${projects.length} projects for developer: ${developerName} (${developerSlug})\n`)

    // Find the developer
    let developer = await prisma.developer.findFirst({
        where: { OR: [{ slug: developerSlug }, { name: developerName }] },
    })

    if (!developer) {
        console.error(`❌ Developer not found: ${developerName} / ${developerSlug}`)
        console.log('   Create the developer first via admin panel.')
        process.exit(1)
    }

    console.log(`✅ Found developer: ${developer.name} (${developer.id})\n`)

    let created = 0
    let updated = 0
    let skipped = 0

    for (const proj of projects) {
        const slug = proj.slug
        if (!slug) { skipped++; continue }

        // Check if project already exists
        const existing = await prisma.project.findUnique({ where: { slug } })

        if (existing) {
            console.log(`  ⏭️  ${proj.name} — already exists, updating CMS data...`)

            // Update highlights
            if (proj.highlights && proj.highlights.length > 0) {
                await prisma.project.update({
                    where: { id: existing.id },
                    data: {
                        highlights: JSON.stringify(proj.highlights),
                        description: proj.description || existing.description,
                        overview: proj.description || existing.overview,
                    },
                })
            }

            // Update amenities
            if (proj.amenities && proj.amenities.length > 0) {
                await prisma.projectAmenity.deleteMany({ where: { projectId: existing.id } })
                await prisma.projectAmenity.createMany({
                    data: proj.amenities.map((name) => ({
                        projectId: existing.id,
                        name: typeof name === 'string' ? name : name.name || '',
                        icon: typeof name === 'object' ? name.icon || null : null,
                        category: null,
                    })),
                })
            }

            // Update nearby places
            if (proj.nearbyPlaces && proj.nearbyPlaces.length > 0) {
                await prisma.projectNearbyPlace.deleteMany({ where: { projectId: existing.id } })
                await prisma.projectNearbyPlace.createMany({
                    data: proj.nearbyPlaces.map((np, idx) => ({
                        projectId: existing.id,
                        name: np.name || '',
                        category: np.category || null,
                        distance: np.distance || null,
                        sortOrder: idx,
                    })),
                })
            }

            // Update payment plans
            if (proj.paymentPlans && proj.paymentPlans.length > 0) {
                await prisma.projectPaymentPlan.deleteMany({ where: { projectId: existing.id } })
                await prisma.projectPaymentPlan.createMany({
                    data: proj.paymentPlans.map((pp, idx) => ({
                        projectId: existing.id,
                        stage: pp.stage || `Stage ${idx + 1}`,
                        percentage: pp.percentage || 0,
                        milestone: pp.milestone || null,
                        sortOrder: pp.sortOrder ?? idx,
                    })),
                })
            }

            // Update location
            if (proj.locationAddress) {
                await prisma.projectLocation.upsert({
                    where: { projectId: existing.id },
                    create: { projectId: existing.id, address: proj.locationAddress },
                    update: { address: proj.locationAddress },
                })
            }

            updated++
            continue
        }

        // Create new project
        console.log(`  ✨ Creating: ${proj.name}...`)

        const newProject = await prisma.project.create({
            data: {
                name: proj.name,
                slug: proj.slug,
                developerId: developer.id,
                city: proj.city || null,
                community: proj.community || null,
                countryIso2: proj.countryIso2 || 'AE',
                description: proj.description || null,
                overview: proj.description || null,
                highlights: proj.highlights && proj.highlights.length > 0 ? JSON.stringify(proj.highlights) : null,
                completionYear: proj.completionYear || null,
                startingPrice: proj.startingPrice || null,
                goldenVisa: proj.goldenVisa || false,
                coverImage: proj.coverImage || null,
                status: proj.status || 'DRAFT',
            },
        })

        // Create amenities
        if (proj.amenities && proj.amenities.length > 0) {
            await prisma.projectAmenity.createMany({
                data: proj.amenities.map((name) => ({
                    projectId: newProject.id,
                    name: typeof name === 'string' ? name : name.name || '',
                    icon: typeof name === 'object' ? name.icon || null : null,
                    category: null,
                })),
            })
        }

        // Create unit types
        if (proj.unitTypes && proj.unitTypes.length > 0) {
            for (let idx = 0; idx < proj.unitTypes.length; idx++) {
                const ut = proj.unitTypes[idx]
                const bedrooms = (() => {
                    const m = (ut.unitType || '').match(/(\d+)/)
                    return m ? parseInt(m[1], 10) : null
                })()

                await prisma.projectUnitType.create({
                    data: {
                        projectId: newProject.id,
                        unitType: ut.unitType || `Unit Type ${idx + 1}`,
                        bedrooms,
                        bathrooms: null,
                        sizeFrom: ut.sizeFrom || null,
                        sizeTo: ut.sizeTo || null,
                        priceFrom: ut.priceFrom || null,
                        sortOrder: idx,
                    },
                })
            }
        }

        // Create payment plans
        if (proj.paymentPlans && proj.paymentPlans.length > 0) {
            await prisma.projectPaymentPlan.createMany({
                data: proj.paymentPlans.map((pp, idx) => ({
                    projectId: newProject.id,
                    stage: pp.stage || `Stage ${idx + 1}`,
                    percentage: pp.percentage || 0,
                    milestone: pp.milestone || null,
                    sortOrder: pp.sortOrder ?? idx,
                })),
            })
        }

        // Create nearby places
        if (proj.nearbyPlaces && proj.nearbyPlaces.length > 0) {
            await prisma.projectNearbyPlace.createMany({
                data: proj.nearbyPlaces.map((np, idx) => ({
                    projectId: newProject.id,
                    name: np.name || '',
                    category: np.category || null,
                    distance: np.distance || null,
                    sortOrder: idx,
                })),
            })
        }

        // Create location
        if (proj.locationAddress) {
            await prisma.projectLocation.create({
                data: { projectId: newProject.id, address: proj.locationAddress },
            })
        }

        created++
    }

    console.log(`\n📊 Migration Complete:`)
    console.log(`   ✨ Created: ${created}`)
    console.log(`   🔄 Updated: ${updated}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log()
}

main()
    .catch((err) => {
        console.error('❌ Migration failed:', err)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
