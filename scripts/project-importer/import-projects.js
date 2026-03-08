/**
 * MillionFlats — DAMAC Project Importer (Full Pipeline)
 *
 * Reads dataset-output.json (from scrape-all-projects.js)
 * Uploads media to S3, inserts all structured data into PostgreSQL
 * via Prisma transactions (prevents partial imports).
 *
 * Usage:
 *   node scripts/project-importer/import-projects.js
 *   node scripts/project-importer/import-projects.js --dry-run
 *   node scripts/project-importer/import-projects.js --skip-images
 *   node scripts/project-importer/import-projects.js --limit 5
 *   node scripts/project-importer/import-projects.js --scrape-first
 */
const path = require("path")
const fs = require("fs")

// ─── Load .env ───
const envPath = path.resolve(__dirname, "..", "..", ".env")
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf-8").split("\n").forEach((line) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) return
        const eqIdx = trimmed.indexOf("=")
        if (eqIdx === -1) return
        const key = trimmed.slice(0, eqIdx).trim()
        let val = trimmed.slice(eqIdx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
            val = val.slice(1, -1)
        if (!process.env[key]) process.env[key] = val
    })
    console.log("✅ Loaded .env")
}

const { PrismaClient } = require("@prisma/client")
const uploadMediaToS3 = require("./upload-s3")

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const SKIP_IMAGES = args.includes("--skip-images")
const SCRAPE_FIRST = args.includes("--scrape-first")
const limitIdx = args.indexOf("--limit")

const c = {
    green: (t) => `\x1b[32m${t}\x1b[0m`,
    yellow: (t) => `\x1b[33m${t}\x1b[0m`,
    red: (t) => `\x1b[31m${t}\x1b[0m`,
    cyan: (t) => `\x1b[36m${t}\x1b[0m`,
    dim: (t) => `\x1b[90m${t}\x1b[0m`,
    bold: (t) => `\x1b[1m${t}\x1b[0m`,
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function main() {
    console.log("")
    console.log(c.bold("═══════════════════════════════════════════════"))
    console.log(c.bold("  MillionFlats — DAMAC Project Importer"))
    console.log(c.bold("═══════════════════════════════════════════════"))
    console.log("")

    if (DRY_RUN) console.log(c.yellow("⚡ DRY RUN — no writes"))
    if (SKIP_IMAGES) console.log(c.yellow("⚡ SKIP IMAGES — no S3 uploads"))

    // ─── Optionally scrape first ───
    if (SCRAPE_FIRST) {
        console.log(c.cyan("  Running scraper first..."))
        const { execSync } = require("child_process")
        const limitArg = limitIdx !== -1 ? `--limit ${args[limitIdx + 1]}` : ""
        execSync(`node "${path.resolve(__dirname, "scrape-all-projects.js")}" ${limitArg}`, { stdio: "inherit" })
        console.log("")
    }

    // ─── Load dataset ───
    const datasetPath = path.resolve(__dirname, "dataset-output.json")
    if (!fs.existsSync(datasetPath)) {
        console.log(c.red("  ✗ dataset-output.json not found!"))
        console.log(c.dim("  Run: node scripts/project-importer/scrape-all-projects.js"))
        process.exit(1)
    }

    let dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"))
    dataset = dataset.filter((d) => !d.error) // Skip failed scrapes

    const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : dataset.length
    const projectsToImport = dataset.slice(0, LIMIT)

    console.log(c.dim(`  Importing ${projectsToImport.length} of ${dataset.length} projects`))
    console.log("")

    const prisma = DRY_RUN ? null : new PrismaClient()

    // ─── Find or create DAMAC developer ───
    let developer = null
    if (!DRY_RUN) {
        developer = await prisma.developer.findFirst({
            where: { OR: [{ slug: "damac" }, { name: "DAMAC Properties" }, { name: "DAMAC" }] },
        })
        if (!developer) {
            developer = await prisma.developer.create({
                data: {
                    name: "DAMAC Properties",
                    slug: "damac",
                    countryCode: "UAE",
                    countryIso2: "AE",
                    isFeatured: true,
                },
            })
        }
        console.log(c.green(`  ✓ Developer: ${developer.name} (${developer.id})`))
        console.log("")
    }

    // ─── Import each project ───
    const results = []

    for (let i = 0; i < projectsToImport.length; i++) {
        const data = projectsToImport[i]
        const num = `[${i + 1}/${projectsToImport.length}]`

        console.log(c.bold(`${num} Importing: ${data.name}`))
        console.log(c.dim(`    Slug: ${data.slug}`))

        if (DRY_RUN) {
            console.log(c.dim("    → Dry run, skipping"))
            console.log(c.dim(`      Amenities: ${data.amenities?.length || 0}, Highlights: ${data.highlights?.length || 0}`))
            console.log(c.dim(`      Floor Plans: ${data.floorPlans?.length || 0}, Nearby: ${data.nearbyPlaces?.length || 0}`))
            console.log(c.dim(`      Payment Plans: ${data.paymentPlans?.length || 0}, Gallery: ${data.gallery?.length || 0}`))
            results.push({ slug: data.slug, status: "dry-run" })
            console.log("")
            continue
        }

        // ─── Check if project already exists ───
        const existing = await prisma.project.findUnique({ where: { slug: data.slug } })
        const isUpdate = !!existing

        if (isUpdate) {
            console.log(c.cyan(`    ↻ Exists — enriching with structured data...`))
        }

        // ─── Upload media to S3 ───
        let coverImageUrl = data.coverImageUrl || null
        const uploadedMedia = []

        if (!SKIP_IMAGES && data.gallery && data.gallery.length > 0) {
            console.log(c.dim(`    Uploading ${data.gallery.length} images...`))
            for (let mi = 0; mi < data.gallery.length; mi++) {
                const imgUrl = data.gallery[mi]
                const folder = mi === 0 ? "hero" : "gallery"
                try {
                    const result = await uploadMediaToS3(imgUrl, "damac", data.slug, folder)
                    if (result) {
                        uploadedMedia.push({ ...result, sortOrder: mi, mediaType: folder === "hero" ? "cover" : "gallery" })
                        if (mi === 0) coverImageUrl = result.objectUrl
                        process.stdout.write(c.green("■"))
                    } else {
                        process.stdout.write(c.red("□"))
                    }
                } catch {
                    process.stdout.write(c.red("□"))
                }
                await delay(200)
            }
            console.log("")
            console.log(c.dim(`    Uploaded ${uploadedMedia.length}/${data.gallery.length} images`))
        }

        // ─── Upload floor plan images ───
        const floorPlanUploads = []
        if (!SKIP_IMAGES && data.floorPlans) {
            for (const fp of data.floorPlans) {
                if (fp.imageUrl) {
                    const result = await uploadMediaToS3(fp.imageUrl, "damac", data.slug, "floorplans")
                    floorPlanUploads.push(result ? result.objectUrl : null)
                } else {
                    floorPlanUploads.push(null)
                }
            }
        }

        // ─── Prisma Transaction — UPSERT + ENRICH atomically ───
        try {
            await prisma.$transaction(async (tx) => {
                let project

                if (isUpdate) {
                    // ═══ UPDATE existing project fields ═══
                    project = await tx.project.update({
                        where: { id: existing.id },
                        data: {
                            description: data.description || existing.description,
                            highlights: data.highlights && data.highlights.length > 0
                                ? JSON.stringify(data.highlights)
                                : existing.highlights || null,
                            city: data.city || existing.city,
                            community: data.community || existing.community,
                            startingPrice: data.startingPrice ?? existing.startingPrice,
                            goldenVisa: data.goldenVisa ?? existing.goldenVisa,
                            coverImage: coverImageUrl || existing.coverImage,
                        },
                    })

                    // ═══ DELETE old structured data (clean slate) ═══
                    await tx.projectAmenity.deleteMany({ where: { projectId: project.id } })
                    await tx.projectPaymentPlan.deleteMany({ where: { projectId: project.id } })
                    await tx.projectFloorPlan.deleteMany({ where: { projectId: project.id } })
                    await tx.projectVideo.deleteMany({ where: { projectId: project.id } })
                    await tx.projectLocation.deleteMany({ where: { projectId: project.id } })
                    await tx.projectNearbyPlace.deleteMany({ where: { projectId: project.id } })
                    // Keep existing media if no new uploads
                    if (uploadedMedia.length > 0) {
                        await tx.projectMedia.deleteMany({ where: { projectId: project.id } })
                    }
                    // Keep existing unit types if we have new floor plans
                    if (data.floorPlans && data.floorPlans.length > 0) {
                        await tx.projectUnitType.deleteMany({ where: { projectId: project.id } })
                    }

                    console.log(c.dim(`    ✓ Project updated, old sub-records cleared`))
                } else {
                    // ═══ CREATE new project ═══
                    project = await tx.project.create({
                        data: {
                            name: data.name,
                            slug: data.slug,
                            developerId: developer.id,
                            countryIso2: data.countryIso2 || "AE",
                            city: data.city || "Dubai",
                            community: data.community || null,
                            description: data.description || null,
                            highlights: data.highlights && data.highlights.length > 0
                                ? JSON.stringify(data.highlights)
                                : null,
                            completionYear: data.completionYear ?? null,
                            startingPrice: data.startingPrice ?? null,
                            goldenVisa: data.goldenVisa || false,
                            coverImage: coverImageUrl,
                            status: "PUBLISHED",
                        },
                    })
                }

                // ═══ INSERT all structured data ═══

                // 2. Media
                if (uploadedMedia.length > 0) {
                    await tx.projectMedia.createMany({
                        data: uploadedMedia.map((m) => ({
                            projectId: project.id,
                            mediaUrl: m.objectUrl,
                            mediaType: m.mediaType,
                            s3Key: m.s3Key,
                            sortOrder: m.sortOrder,
                        })),
                    })
                }

                // 3. Amenities
                if (data.amenities && data.amenities.length > 0) {
                    await tx.projectAmenity.createMany({
                        data: data.amenities.map((a) => ({
                            projectId: project.id,
                            name: a.name || a,
                            icon: a.icon || null,
                            category: a.category || null,
                        })),
                    })
                }

                // 4. Payment plans
                if (data.paymentPlans && data.paymentPlans.length > 0) {
                    await tx.projectPaymentPlan.createMany({
                        data: data.paymentPlans.map((pp, idx) => ({
                            projectId: project.id,
                            stage: pp.stage,
                            percentage: pp.percentage,
                            milestone: pp.milestone || null,
                            sortOrder: idx,
                        })),
                    })
                }

                // 5. Floor plans
                if (data.floorPlans && data.floorPlans.length > 0) {
                    await tx.projectFloorPlan.createMany({
                        data: data.floorPlans.map((fp, idx) => ({
                            projectId: project.id,
                            unitType: fp.unitType,
                            bedrooms: fp.bedrooms ?? null,
                            size: fp.size || null,
                            price: fp.price || null,
                            imageUrl: floorPlanUploads[idx] || fp.imageUrl || null,
                            s3Key: null,
                        })),
                    })
                }

                // 6. Unit types (from floor plans)
                if (data.floorPlans && data.floorPlans.length > 0) {
                    await tx.projectUnitType.createMany({
                        data: data.floorPlans.map((fp) => ({
                            projectId: project.id,
                            unitType: fp.unitType,
                            sizeFrom: fp.size ? parseInt(fp.size.replace(/[^\d]/g, ""), 10) || null : null,
                            sizeTo: null,
                            priceFrom: data.startingPrice ?? null,
                        })),
                    })
                }

                // 7. Videos
                if (data.videos && data.videos.length > 0) {
                    await tx.projectVideo.createMany({
                        data: data.videos.map((v, idx) => ({
                            projectId: project.id,
                            videoUrl: v.videoUrl,
                            title: v.title || null,
                            thumbnail: v.thumbnail || null,
                            sortOrder: idx,
                        })),
                    })
                }

                // 8. Location
                if (data.location && (data.location.address || data.location.latitude)) {
                    await tx.projectLocation.create({
                        data: {
                            projectId: project.id,
                            latitude: data.location.latitude ?? null,
                            longitude: data.location.longitude ?? null,
                            address: data.location.address || null,
                            mapUrl: data.location.mapUrl || null,
                        },
                    })
                }

                // 9. Nearby places
                if (data.nearbyPlaces && data.nearbyPlaces.length > 0) {
                    await tx.projectNearbyPlace.createMany({
                        data: data.nearbyPlaces.map((np, idx) => ({
                            projectId: project.id,
                            name: np.name,
                            category: np.category || null,
                            distance: np.distance || null,
                            sortOrder: idx,
                        })),
                    })
                }

                const action = isUpdate ? "enriched" : "created"
                console.log(c.green(`    ✓ Project ${action}: ${project.id}`))
                console.log(`      → ${c.cyan(`${data.amenities?.length || 0} amenities`)}, ${c.cyan(`${data.paymentPlans?.length || 0} plans`)}, ${c.cyan(`${data.floorPlans?.length || 0} floor plans`)}`)
                console.log(`      → ${c.cyan(`${uploadedMedia.length} media`)}, ${c.cyan(`${data.nearbyPlaces?.length || 0} nearby`)}, ${c.cyan(`${data.highlights?.length || 0} highlights`)}`)

                results.push({ slug: data.slug, status: action, projectId: project.id })
            })
        } catch (err) {
            console.log(c.red(`    ✗ Import failed: ${err.message}`))
            results.push({ slug: data.slug, status: "error", reason: err.message })
        }

        console.log("")
        await delay(500)
    }

    // ─── Summary ───
    const created = results.filter((r) => r.status === "created").length
    const enriched = results.filter((r) => r.status === "enriched").length
    const skipped = results.filter((r) => r.status === "skipped").length
    const errors = results.filter((r) => r.status === "error").length
    const dryRun = results.filter((r) => r.status === "dry-run").length

    console.log(c.bold("═══════════════════════════════════════════════"))
    console.log(c.bold("  IMPORT SUMMARY"))
    console.log(c.bold("═══════════════════════════════════════════════"))
    console.log(`  Total: ${results.length}`)
    if (created > 0) console.log(c.green(`  ✓ Created: ${created}`))
    if (enriched > 0) console.log(c.green(`  ↻ Enriched: ${enriched}`))
    if (skipped > 0) console.log(c.yellow(`  ⊘ Skipped: ${skipped}`))
    if (errors > 0) console.log(c.red(`  ✗ Errors: ${errors}`))
    if (dryRun > 0) console.log(c.cyan(`  📝 Dry-run: ${dryRun}`))
    console.log("")

    if (errors > 0) {
        console.log(c.red("  Errors:"))
        results.filter((r) => r.status === "error").forEach((r) => {
            console.log(c.red(`    • ${r.slug}: ${r.reason}`))
        })
        console.log("")
    }

    if (prisma) await prisma.$disconnect()
    console.log(c.bold("DONE ✅"))
}

main().catch((err) => {
    console.error("FATAL:", err)
    process.exit(1)
})
