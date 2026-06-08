
const fs = require("fs")
const path = require("path")
const { PrismaClient } = require("@prisma/client")
const db = new PrismaClient()

function slugify(text) {
    return String(text || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 120)
}

async function updateProject(data) {

    if (!db.project) {
        console.log('❌ Prisma Client does not expose `project` model. Regenerate Prisma Client against the current schema on the environment where you run this updater.')
        return
    }

    const project = await db.project.findFirst({
        where: { slug: data.slug },
        select: { id: true, developerId: true }
    })

    if (!project) {
        console.log(`❌ Project not found: ${data.slug}`)
        return
    }

    // Parse highlights or ecoConcepts into JSON array
    let highlightsJson = undefined;
    if (data.highlights) {
        highlightsJson = JSON.stringify(data.highlights);
    } else if (data.ecoConcept) {
        highlightsJson = JSON.stringify(data.ecoConcept);
    }

    // Calculate minimum starting price
    let startingPrice = undefined;
    if (data.startingPrices) {
        const prices = Object.values(data.startingPrices).map(p => {
            const num = parseFloat(p.replace(/[^0-9.]/g, ''));
            if (p.includes('M')) return num * 1000000;
            if (p.includes('K')) return num * 1000;
            return num;
        });
        if (prices.length > 0) {
            startingPrice = Math.min(...prices);
        }
    }

    // Parse payment plans
    const paymentPlanRecords = [];
    if (data.paymentPlan) {
        let sortOrder = 0;
        for (const [key, val] of Object.entries(data.paymentPlan)) {
            paymentPlanRecords.push({
                stage: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                percentage: parseFloat(val.replace('%', '')),
                sortOrder: sortOrder++
            });
        }
    }

    // Parse unit types
    const unitTypeRecords = [];
    if (data.unitTypes) {
        data.unitTypes.forEach(u => {
            let priceStr = undefined;
            if (data.startingPrices) {
                const match = Object.keys(data.startingPrices).find(k => k && u.includes(k.replace('BR', ' Bedroom')));
                if (!match) {
                    const match2 = Object.keys(data.startingPrices).find(k => u.includes(k.charAt(0)));
                    if (match2) priceStr = data.startingPrices[match2];
                } else {
                    priceStr = data.startingPrices[match];
                }
            }

            let priceFrom = null;
            if (priceStr) {
                const num = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
                if (priceStr.includes('M')) priceFrom = num * 1000000;
                else if (priceStr.includes('K')) priceFrom = num * 1000;
            }

            unitTypeRecords.push({
                unitType: u,
                priceFrom: priceFrom
            });
        });
    }

    // Build gallery records with tab category from structured media object
    let galleryRecords = []
    let heroUrl = undefined
    if (data.media && typeof data.media === 'object') {
        // Set hero / cover image
        if (data.media.hero) {
            heroUrl = data.media.hero
        }

        // Add featured images (deduplicate within featured only)
        if (Array.isArray(data.media.featured)) {
            const featuredSeen = new Set()
            data.media.featured.forEach(u => {
                if (u && !featuredSeen.has(u)) {
                    featuredSeen.add(u)
                    galleryRecords.push({ url: u, category: 'featured' })
                }
            })
        }

        // Add tab images (deduplicate within each tab only, NOT across tabs/featured)
        if (data.media.tabs && typeof data.media.tabs === 'object') {
            for (const [tabName, tabImages] of Object.entries(data.media.tabs)) {
                if (Array.isArray(tabImages)) {
                    const tabSeen = new Set()
                    tabImages.forEach(u => {
                        if (u && !tabSeen.has(u)) {
                            tabSeen.add(u)
                            galleryRecords.push({ url: u, category: tabName })
                        }
                    })
                }
            }
        }
    }

    // Apply updates as Nested Writes in Prisma
    try {
        let developerNestedWrite = undefined
        if (data.developer && typeof data.developer === 'string' && data.developer.trim()) {
            const developerName = data.developer.trim()

            // If the project already has a developerId, keep it stable by connecting to it.
            // Otherwise, connect (or create) by name.
            developerNestedWrite = project.developerId
                ? { connect: { id: project.developerId } }
                : {
                    connectOrCreate: {
                        where: { name: developerName },
                        create: {
                            name: developerName,
                            slug: slugify(developerName),
                        },
                    },
                }
        }

        // Delete all old gallery media before re-creating
        const mediaTypeCategories = ['IMAGE', 'featured', 'exterior', 'amenities', 'interiors', 'lifestyle']

        await db.project.update({
            where: { id: project.id },
            data: {
                ...(developerNestedWrite !== undefined && { developer: developerNestedWrite }),
                description: data.description,
                city: data.location || undefined,
                ...(highlightsJson !== undefined && { highlights: highlightsJson }),
                ...(startingPrice !== undefined && { startingPrice }),
                ...(heroUrl !== undefined && { coverImage: heroUrl }),

                amenities: data.amenities ? {
                    deleteMany: {},
                    create: data.amenities.map(a => ({ name: a }))
                } : undefined,

                media: galleryRecords.length > 0 ? {
                    deleteMany: { mediaType: { in: mediaTypeCategories } },
                    create: galleryRecords.map((r, i) => ({
                        mediaUrl: r.url,
                        mediaType: r.category,
                        sortOrder: i
                    }))
                } : undefined,

                nearbyPlaces: data.connectivity ? {
                    deleteMany: {},
                    create: data.connectivity.map((c, i) => ({
                        name: c.place,
                        distance: c.time,
                        sortOrder: i
                    }))
                } : undefined,

                unitTypes: data.unitTypes ? {
                    deleteMany: {},
                    create: unitTypeRecords
                } : undefined,

                paymentPlans: paymentPlanRecords.length > 0 ? {
                    deleteMany: {},
                    create: paymentPlanRecords
                } : undefined
            }
        });

        console.log(`✅ Updated ${data.name}`)
    } catch (err) {
        console.log(`❌ Failed to update ${data.name}:`, err.message)
    }
}

async function run() {

    console.log("MillionFlats - Project Updater")

    const chelsea = require("./data/chelsea-residences.json")
    const islands = require("./data/damac-islands-2.json")

    await updateProject(chelsea)
    await updateProject(islands)

    console.log("\n🎉 Projects Updated Successfully\n")
    await db.$disconnect()
}

run().catch(err => {
    fs.writeFileSync('error-log.txt', err.stack)
    console.error("Wrote to error-log.txt")
    process.exit(1)
})
