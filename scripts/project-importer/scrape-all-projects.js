/**
 * MillionFlats — Scrape All DAMAC Projects
 *
 * Scrapes all 33 DAMAC project pages from PropJunction
 * and outputs a structured dataset JSON file.
 *
 * Usage:
 *   node scripts/project-importer/scrape-all-projects.js
 *   node scripts/project-importer/scrape-all-projects.js --puppeteer
 *   node scripts/project-importer/scrape-all-projects.js --limit 5
 */
const path = require("path")
const fs = require("fs")

const urls = require("./damac-project-urls")
const { scrapeWithCheerio, scrapeWithPuppeteer } = require("./scrape-project")

const args = process.argv.slice(2)
const USE_PUPPETEER = args.includes("--puppeteer")
const limitIdx = args.indexOf("--limit")
const LIMIT = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : urls.length

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
    console.log(c.bold("  MillionFlats — DAMAC Project Scraper"))
    console.log(c.bold("═══════════════════════════════════════════════"))
    console.log("")
    console.log(c.dim(`  Mode: ${USE_PUPPETEER ? "Puppeteer (headless browser)" : "Cheerio (HTTP)"}`))
    console.log(c.dim(`  Projects to scrape: ${Math.min(LIMIT, urls.length)} of ${urls.length}`))
    console.log("")

    let browser = null
    if (USE_PUPPETEER) {
        try {
            const puppeteer = require("puppeteer-core")
            // Try common Chrome paths on Windows/Linux/Mac
            const chromePaths = [
                "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
                "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
                "/usr/bin/google-chrome",
                "/usr/bin/chromium-browser",
                "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            ]
            let executablePath = null
            for (const cp of chromePaths) {
                if (fs.existsSync(cp)) { executablePath = cp; break }
            }
            if (!executablePath) {
                console.log(c.yellow("  ⚠ Chrome not found, falling back to Cheerio mode"))
            } else {
                browser = await puppeteer.launch({
                    headless: "new",
                    executablePath,
                    args: ["--no-sandbox", "--disable-setuid-sandbox"],
                })
                console.log(c.green(`  ✓ Puppeteer launched (${executablePath})`))
            }
        } catch (err) {
            console.log(c.yellow(`  ⚠ Puppeteer failed: ${err.message}. Falling back to Cheerio.`))
        }
    }

    const dataset = []
    const projectsToProcess = urls.slice(0, LIMIT)

    for (let i = 0; i < projectsToProcess.length; i++) {
        const url = projectsToProcess[i]
        const num = `[${i + 1}/${projectsToProcess.length}]`

        console.log(c.bold(`${num} Scraping: ${url}`))

        try {
            const data = browser
                ? await scrapeWithPuppeteer(url, browser)
                : await scrapeWithCheerio(url)

            console.log(`  📝 Name: ${data.name}`)
            console.log(`  🔗 Slug: ${data.slug}`)
            console.log(`  📍 ${data.community || "—"}, ${data.city}`)
            console.log(`  💰 Starting: ${data.startingPrice ? `AED ${(data.startingPrice / 1_000_000).toFixed(2)}M` : "N/A"}`)
            console.log(`  🎯 Amenities: ${data.amenities.length}`)
            console.log(`  ✨ Highlights: ${data.highlights.length}`)
            console.log(`  💳 Payment Plans: ${data.paymentPlans.length}`)
            console.log(`  🏗  Floor Plans: ${data.floorPlans.length}`)
            console.log(`  🖼  Gallery: ${data.gallery.length}`)
            console.log(`  🎬 Videos: ${data.videos.length}`)
            console.log(`  📍 Nearby: ${data.nearbyPlaces.length}`)

            dataset.push(data)
        } catch (err) {
            console.log(c.red(`  ✗ Failed: ${err.message}`))
            dataset.push({ sourceUrl: url, error: err.message })
        }

        console.log("")
        await delay(browser ? 2000 : 1000)
    }

    if (browser) await browser.close()

    // Save dataset
    const outputPath = path.resolve(__dirname, "dataset-output.json")
    fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), "utf-8")

    const successful = dataset.filter((d) => !d.error).length
    const failed = dataset.filter((d) => d.error).length

    console.log(c.bold("═══════════════════════════════════════════════"))
    console.log(c.bold("  SCRAPE SUMMARY"))
    console.log(c.bold("═══════════════════════════════════════════════"))
    console.log(`  Total: ${dataset.length}`)
    if (successful > 0) console.log(c.green(`  ✓ Successful: ${successful}`))
    if (failed > 0) console.log(c.red(`  ✗ Failed: ${failed}`))
    console.log(c.cyan(`  📁 Dataset saved: ${outputPath}`))
    console.log("")
    console.log(c.bold("  Next step: node scripts/project-importer/import-projects.js"))
    console.log("")
}

main().catch((err) => {
    console.error("FATAL:", err)
    process.exit(1)
})
