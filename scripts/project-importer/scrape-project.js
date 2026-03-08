/**
 * MillionFlats — PropJunction Project Scraper (Puppeteer + Cheerio Hybrid)
 *
 * Uses Puppeteer for headless browser rendering (JS-loaded content)
 * Falls back to Cheerio when Puppeteer is unavailable.
 *
 * Extracts:  name, description, highlights, amenities, payment plans,
 *            floor plans, gallery images, videos, location, nearby places
 */
const axios = require("axios")
const cheerio = require("cheerio")

/* ═══════════════════════════════════════════════
   SLUG MAPPING: PropJunction slug → MillionFlats slug
   ═══════════════════════════════════════════════ */
const SLUG_MAP = {
    "damac-islands-phase-2": "damac-islands-2",
    "damac-district": "damac-district",
    "damac-chelsea-residences": "chelsea-residences",
    "damac-safa-gate": "safa-gate",
    "damac-riverside-views": "damac-riverside-views",
    "damac-riverside": "damac-riverside",
    "damac-cavalli-couture": "couture-by-cavalli",
    "damac-altitude": "altitude-de-grisogono",
    "damac-lagoon-views": "lagoon-views",
    "damac-casa-tower": "damac-casa",
    "golf-greens-at-damac-hills": "golf-greens",
    "damac-canal-crown": "canal-crown",
    "damac-canal-heights": "canal-heights",
    "damac-canal-heights-2": "canal-heights-2-de-grisogono",
    "damac-bay-cavalli": "damac-bay-by-cavalli",
    "damac-bay-2-cavalli": "damac-bay-2-by-cavalli",
    "damac-harbour-lights": "harbour-lights-de-grisogono-geneve",
    "damac-safa-two": "safa-two-de-grisogono-tower-b",
    "damac-cavalli-towers": "cavalli-tower",
    "duo-prestige-villas": "prestige-villas-at-damac-hills-2",
    "damac-towers-by-paramount-hotels": "damac-towers-by-paramount-hotels-and-resorts-dubai",
    "belair-phase-2": "belair-at-the-trump-estates-phase-2",
    "damac-park-town": "park-town-at-damac-hills",
    "aykon-city-tower-b": "aykon-city-tower-b",
    "majestine": "damac-majestine",
    "volta-residence": "volta",
    "chic-tower": "chic-tower",
    "cavalli-estates": "cavalli-estates",
    "safa-one-by-de-grisogono": "safa-one-de-grisogono",
    "damac-residenze": "damac-residenze",
    "maison-canal-views": "damac-maison-canal-views",
    "damac-paramount-tower-hotel-and-residences-dubai": "damac-paramount-tower-hotel-and-residences-dubai",
    "golf-town-at-damac-hills": "golf-town-at-damac-hills",
}

/* ═══════════════════════════════════════════════
   AMENITY ICON MAP — maps common amenity names to icon identifiers
   ═══════════════════════════════════════════════ */
const AMENITY_ICONS = {
    "swimming pool": "pool", "infinity pool": "pool", "kids pool": "pool",
    "gymnasium": "gym", "fitness centre": "gym", "fully-equipped gymnasium": "gym",
    "restaurants": "restaurant", "dining outlets": "restaurant",
    "cycling trails": "bike", "jogging trails": "run", "running track": "run",
    "parks and leisure areas": "park", "landscaped garden": "garden",
    "24x7 security": "security", "indoor parking": "parking", "parking facility": "parking",
    "supermarket": "shopping", "retail outlets": "shopping", "shops & outlets": "shopping",
    "health care centre": "health", "spa & sauna": "spa", "steam room & saunas": "spa",
    "club house": "club", "multipurpose hall": "community", "multi purpose lounge": "community",
    "yoga court": "yoga", "tennis courts": "tennis", "basketball court": "basketball",
    "kids play area": "kids", "kids park": "kids", "amusement park": "entertainment",
    "amphitheatre": "entertainment", "games room": "entertainment", "indoor games": "entertainment",
    "power backups": "power", "water treatment": "water",
    "green surrounding": "nature", "festive lawn": "events",
    "ample parking space": "parking", "sports court": "sports",
}

/* ═══════════════════════════════════════════════
   HELPER FUNCTIONS
   ═══════════════════════════════════════════════ */

function parsePrice(text) {
    if (!text) return null
    const millionMatch = text.match(/([\d,.]+)\s*(?:million|m)\b/i)
    if (millionMatch) {
        const val = parseFloat(millionMatch[1].replace(/,/g, "")) * 1_000_000
        return val >= 100_000 ? val : null
    }
    const billionMatch = text.match(/([\d,.]+)\s*(?:billion|b)\b/i)
    if (billionMatch) {
        const val = parseFloat(billionMatch[1].replace(/,/g, "")) * 1_000_000_000
        return val >= 1_000_000 ? val : null
    }
    const numberMatch = text.match(/AED\s*([\d,]+)/i)
    if (numberMatch) {
        const val = parseInt(numberMatch[1].replace(/,/g, ""), 10)
        return val >= 100_000 ? val : null
    }
    return null
}

function extractCommunity($) {
    const communityLink = $('a[href*="/community/"]').first()
    if (communityLink.length) {
        return communityLink.text().trim().replace(/,\s*Dubai$/i, "").trim()
    }
    return ""
}

function getAmenityIcon(name) {
    const lower = (name || "").toLowerCase().trim()
    return AMENITY_ICONS[lower] || null
}

function getAmenityCategory(name) {
    const lower = (name || "").toLowerCase().trim()
    if (lower.includes("pool") || lower.includes("gym") || lower.includes("fitness") || lower.includes("yoga") || lower.includes("running") || lower.includes("jogging") || lower.includes("cycling") || lower.includes("sport") || lower.includes("tennis") || lower.includes("basketball")) return "fitness"
    if (lower.includes("restaurant") || lower.includes("dining") || lower.includes("cafe")) return "dining"
    if (lower.includes("park") || lower.includes("garden") || lower.includes("green") || lower.includes("lawn")) return "nature"
    if (lower.includes("security") || lower.includes("parking") || lower.includes("power") || lower.includes("water")) return "infrastructure"
    if (lower.includes("kids") || lower.includes("play") || lower.includes("amusement") || lower.includes("game") || lower.includes("amphitheatre") || lower.includes("entertainment")) return "entertainment"
    if (lower.includes("spa") || lower.includes("sauna") || lower.includes("steam") || lower.includes("club") || lower.includes("lounge")) return "wellness"
    if (lower.includes("shop") || lower.includes("retail") || lower.includes("supermarket") || lower.includes("outlet")) return "shopping"
    if (lower.includes("health") || lower.includes("care")) return "healthcare"
    return "general"
}

/* ═══════════════════════════════════════════════
   MAIN SCRAPER — works with Cheerio on HTML string
   ═══════════════════════════════════════════════ */
function extractFromHtml(html, url) {
    const $ = cheerio.load(html)

    const urlSlug = url.split("/projects/")[1]?.replace(/\/$/, "")?.toLowerCase()
    const slug = SLUG_MAP[urlSlug] || urlSlug || "unknown"

    // ─── Name ───
    const rawH1 = $("h1").first().text().trim()
    const firstLine = rawH1.split(/\n/)[0].trim()
    const name = firstLine
        .replace(/\s+at\s+.*/i, "")
        .replace(/\s+by\s+.*/i, "")
        .replace(/\s+in\s+.*/i, "")
        .trim()

    // ─── OG Image & Description ───
    const ogImage = $('meta[property="og:image"]').attr("content") || ""
    const ogDesc = $('meta[property="og:description"]').attr("content") || ""
    const bannerUrl = ogImage || `https://www.propjunction.ae/uploads/project/banner/${urlSlug}.jpg`

    // ─── Starting Price ───
    let startingPrice = null
    $("h2").each((_, el) => {
        const text = $(el).text().trim()
        if (text.match(/^AED\s/i) && !startingPrice) {
            startingPrice = parsePrice(text)
        }
    })
    if (!startingPrice) {
        const bodyText = $("body").text()
        const priceMatch = bodyText.match(/Starting\s+Price[:\s]*(AED\s+[\d,.]+\s*(?:Million|M))/i)
        if (priceMatch) startingPrice = parsePrice(priceMatch[1])
    }

    // ─── Full Description from Overview ───
    let description = ogDesc
    const overviewParagraphs = []
    let foundOverview = false
    $("h2, p").each((_, el) => {
        const tag = el.tagName
        const text = $(el).text().trim()
        if (tag === "h2" && text.match(/overview/i)) { foundOverview = true; return }
        if (foundOverview) {
            if (tag === "h2") { foundOverview = false; return }
            if (tag === "p" && text.length > 50) overviewParagraphs.push(text)
        }
    })
    if (overviewParagraphs.length > 0) description = overviewParagraphs.join("\n\n")

    // ─── Highlights ───
    const highlights = []
    let foundHighlights = false
    $("h3, h2, li").each((_, el) => {
        const tag = el.tagName
        const text = $(el).text().trim()
        if ((tag === "h3" || tag === "h2") && text.match(/key\s+highlights/i)) { foundHighlights = true; return }
        if (foundHighlights) {
            if (tag === "h3" || tag === "h2") { foundHighlights = false; return }
            if (tag === "li" && text.length > 10 && text.length < 500) highlights.push(text)
        }
    })

    // ─── Community ───
    const community = extractCommunity($)

    // ─── Amenities ───
    const amenities = []
    let foundAmenities = false
    $("h2, li").each((_, el) => {
        const tag = el.tagName
        const text = $(el).text().trim()
        if (tag === "h2" && text.match(/amenities/i)) { foundAmenities = true; return }
        if (foundAmenities) {
            if (tag === "h2") { foundAmenities = false; return }
            if (tag === "li" && text.length > 2 && text.length < 100) {
                amenities.push({
                    name: text,
                    icon: getAmenityIcon(text),
                    category: getAmenityCategory(text),
                })
            }
        }
    })

    // ─── Payment Plans ───
    const paymentPlans = []
    let foundPayment = false
    $("h2, li, p").each((_, el) => {
        const tag = el.tagName
        const text = $(el).text().trim()
        if (tag === "h2" && text.match(/payment\s+plan/i)) { foundPayment = true; return }
        if (foundPayment) {
            if (tag === "h2") { foundPayment = false; return }
            // Try to parse "20% Down Payment" or "60% During Construction" or "20% On Handover"
            const pctMatch = text.match(/(\d+)%\s*(.+)/i)
            if (pctMatch) {
                paymentPlans.push({
                    stage: pctMatch[2].trim(),
                    percentage: parseInt(pctMatch[1], 10),
                })
            }
        }
    })
    // If no plans parsed, try to extract from the common PropJunction pattern in the Summary section
    if (paymentPlans.length === 0) {
        const bodyText = $("body").text()
        // Match "Payment Plan" followed by ratio like "70/30" or "80/20" or "60/40"
        const planMatch = bodyText.match(/Payment\s*Plan\s*(\d+)\/(\d+)/i)
        if (planMatch) {
            const constructionPct = parseInt(planMatch[1], 10)
            const handoverPct = parseInt(planMatch[2], 10)
            if (constructionPct + handoverPct === 100) {
                paymentPlans.push(
                    { stage: "During Construction", percentage: constructionPct },
                    { stage: "On Handover", percentage: handoverPct }
                )
            }
        }
    }

    // ─── Floor Plans / Unit Types ───
    const floorPlans = []
    const seenBedrooms = new Set()
    $("h2").each((_, el) => {
        const text = $(el).text().trim()
        const bedroomMatch = text.match(/(\d+)\s*Bedroom/i)
        if (bedroomMatch) {
            const bedCount = parseInt(bedroomMatch[1], 10)
            if (!seenBedrooms.has(bedCount)) {
                seenBedrooms.add(bedCount)
                const sibling = $(el).next()
                let propType = "Apartment"
                let size = null
                if (sibling.length) {
                    const sibText = sibling.text().toLowerCase()
                    if (sibText.includes("penthouse")) propType = "Penthouse"
                    else if (sibText.includes("villa")) propType = "Villa"
                    else if (sibText.includes("duplex")) propType = "Duplex"
                    else if (sibText.includes("townhouse")) propType = "Townhouse"
                    const sizeMatch = sibText.match(/size[:\s]*([\d,]+)\s*sq/i)
                    if (sizeMatch) size = sizeMatch[1].replace(/,/g, "")
                }
                floorPlans.push({
                    unitType: `${bedCount} Bedroom ${propType}`,
                    bedrooms: bedCount,
                    size: size ? `${size} sqft` : "On Request",
                    price: null,
                    imageUrl: null,
                })
            }
        }
    })
    // Also check for "Floor Layout" or "Floor Plan" sections
    if (floorPlans.length === 0) {
        $("h2").each((_, el) => {
            const text = $(el).text().trim()
            if (text.match(/floor\s*(layout|plan)/i)) {
                const sibling = $(el).nextAll("li, div").first()
                if (sibling.length) {
                    const sibText = sibling.text()
                    const typeMatch = sibText.match(/Property\s*Type:\s*(\w+)/i)
                    if (typeMatch) {
                        floorPlans.push({
                            unitType: typeMatch[1],
                            bedrooms: null,
                            size: "On Request",
                            price: null,
                            imageUrl: null,
                        })
                    }
                }
            }
        })
    }

    // ─── Gallery Images (only real project images, not UI icons) ───
    const mediaUrls = new Set()
    if (bannerUrl) mediaUrls.add(bannerUrl)

    $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || ""
        if (!src) return
        if (
            !src.includes("icon") &&
            !src.includes("logo") &&
            !src.includes("favicon") &&
            !src.endsWith(".svg") &&
            !src.includes("placeholder") &&
            !src.includes("/projects/images/") &&
            (src.includes("cms.propjunction") || src.includes("Banner") || src.includes("Gallery") || src.includes("gallery"))
        ) {
            const fullUrl = src.startsWith("http") ? src : `https://www.propjunction.ae${src}`
            mediaUrls.add(fullUrl)
        }
    })

    // Background images
    $("[style*='background-image']").each((_, el) => {
        const style = $(el).attr("style") || ""
        const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/)
        if (match && match[1] && (match[1].includes("cms.propjunction") || match[1].includes("uploads/"))) {
            const fullUrl = match[1].startsWith("http") ? match[1] : `https://www.propjunction.ae${match[1]}`
            mediaUrls.add(fullUrl)
        }
    })

    // ─── Videos ───
    const videos = []
    $("iframe, video, a[href*='youtube'], a[href*='vimeo']").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("href") || ""
        if (src && (src.includes("youtube") || src.includes("vimeo") || src.includes("video"))) {
            videos.push({ videoUrl: src, title: null, thumbnail: null })
        }
    })

    // ─── Location ───
    let locationDescription = ""
    let foundLocation = false
    $("h2, p").each((_, el) => {
        const tag = el.tagName
        const text = $(el).text().trim()
        if (tag === "h2" && text.match(/^location$/i)) { foundLocation = true; return }
        if (foundLocation) {
            if (tag === "h2" || tag === "h3") { foundLocation = false; return }
            if (tag === "p" && text.length > 30 && !locationDescription) locationDescription = text
        }
    })

    // ─── Nearby Places from Location Connectivity section ───
    const nearbyPlaces = []
    let foundNearby = false
    $("h3, h2, li").each((_, el) => {
        const tag = el.tagName
        const text = $(el).text().trim()
        if ((tag === "h3" || tag === "h2") && text.match(/location\s+connectivity/i)) { foundNearby = true; return }
        if (foundNearby) {
            if (tag === "h3" || tag === "h2") { foundNearby = false; return }
            if (tag === "li" && text.length > 3 && text.length < 200) {
                // Format: "Dubai Mall – 10 min" or "Burj Khalifa - 5 min"
                const parts = text.split(/[–\-—]/).map(s => s.trim())
                nearbyPlaces.push({
                    name: parts[0] || text,
                    distance: parts[1] || null,
                    category: null,
                })
            }
        }
    })

    return {
        name,
        slug,
        sourceUrl: url,
        developer: "DAMAC Properties",
        developerSlug: "damac",
        city: "Dubai",
        community,
        countryIso2: "AE",
        goldenVisa: true,
        startingPrice,
        completionYear: null,
        description,
        highlights,
        coverImageUrl: bannerUrl,
        amenities,
        paymentPlans,
        floorPlans,
        gallery: Array.from(mediaUrls),
        videos,
        location: {
            address: locationDescription || null,
            latitude: null,
            longitude: null,
            mapUrl: null,
        },
        nearbyPlaces,
        status: "PUBLISHED",
    }
}

/* ═══════════════════════════════════════════════
   PUPPETEER SCRAPER — opens page with headless browser
   ═══════════════════════════════════════════════ */
async function scrapeWithPuppeteer(url, browser) {
    const page = await browser.newPage()
    try {
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 })
        // Wait for dynamic content
        await page.waitForSelector("h1", { timeout: 10000 }).catch(() => { })
        // Scroll to trigger lazy loads
        await page.evaluate(async () => {
            for (let i = 0; i < 5; i++) {
                window.scrollBy(0, window.innerHeight)
                await new Promise(r => setTimeout(r, 500))
            }
            window.scrollTo(0, 0)
        })
        await new Promise(r => setTimeout(r, 1000))
        const html = await page.content()
        return extractFromHtml(html, url)
    } finally {
        await page.close()
    }
}

/* ═══════════════════════════════════════════════
   CHEERIO-ONLY SCRAPER (fallback)
   ═══════════════════════════════════════════════ */
async function scrapeWithCheerio(url) {
    const { data } = await axios.get(url, {
        timeout: 30000,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    })
    return extractFromHtml(data, url)
}

/* ═══════════════════════════════════════════════
   EXPORTS
   ═══════════════════════════════════════════════ */
module.exports = {
    scrapeWithPuppeteer,
    scrapeWithCheerio,
    extractFromHtml,
    SLUG_MAP,
}
