/**
 * Property Scraper — SquareYards.com → ManualProperty JSON
 * 
 * Reads .txt files from scrap/ directory containing squareyards.com URLs,
 * scrapes property data using a hybrid approach (meta tags + Puppeteer fallback),
 * and outputs structured JSON ready for the admin bulk import API.
 * 
 * Usage:
 *   node scripts/scrapeProperties.js                          # Process all .txt files in scrap/
 *   node scripts/scrapeProperties.js --file="scrap/Navi Mumbai.txt"  # Process single file
 *   node scripts/scrapeProperties.js --file="scrap/Navi Mumbai.txt" --limit=2  # Limit URLs
 *   node scripts/scrapeProperties.js --dry-run                # Print URLs only, don't scrape
 * 
 * Output: scrap/output/{city}_properties.json
 */

const axios = require('axios')
const cheerio = require('cheerio')
const fs = require('fs')
const path = require('path')

// ─── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (name) => {
    const arg = args.find(a => a.startsWith(`--${name}=`))
    return arg ? arg.split('=').slice(1).join('=') : null
}
const hasFlag = (name) => args.includes(`--${name}`)

const singleFile = getArg('file')
const urlLimit = parseInt(getArg('limit') || '0', 10) || 0
const isDryRun = hasFlag('dry-run')
const usePuppeteer = hasFlag('puppeteer')

// ─── Constants ───────────────────────────────────────────────────────────────

const SCRAP_DIR = path.join(__dirname, '..', 'scrap')
const OUTPUT_DIR = path.join(SCRAP_DIR, 'output')
const REQUEST_DELAY_MS = 2000  // Be polite to the server
const MAX_RETRIES = 2

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
}

// ─── City Detection from URL/Filename ────────────────────────────────────────

const CITY_MAP = {
    'navi-mumbai': { city: 'Navi Mumbai', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'mumbai': { city: 'Mumbai', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'delhi': { city: 'Delhi', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'noida': { city: 'Noida', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'gurgaon': { city: 'Gurgaon', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'gurugram': { city: 'Gurugram', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'bengaluru': { city: 'Bengaluru', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'bangalore': { city: 'Bengaluru', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'hyderabad': { city: 'Hyderabad', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'pune': { city: 'Pune', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'chennai': { city: 'Chennai', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'kolkata': { city: 'Kolkata', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'ahmedabad': { city: 'Ahmedabad', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'jaipur': { city: 'Jaipur', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'lucknow': { city: 'Lucknow', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'chandigarh': { city: 'Chandigarh', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'kochi': { city: 'Kochi', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'indore': { city: 'Indore', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'thane': { city: 'Thane', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' },
    'dubai': { city: 'Dubai', countryCode: 'UAE', countryIso2: 'AE', currency: 'AED' },
    'abu-dhabi': { city: 'Abu Dhabi', countryCode: 'UAE', countryIso2: 'AE', currency: 'AED' },
    'sharjah': { city: 'Sharjah', countryCode: 'UAE', countryIso2: 'AE', currency: 'AED' },
    'ajman': { city: 'Ajman', countryCode: 'UAE', countryIso2: 'AE', currency: 'AED' },
}

function detectCityFromUrl(url) {
    const lower = url.toLowerCase()
    for (const [key, meta] of Object.entries(CITY_MAP)) {
        if (lower.includes(key)) return meta
    }
    return { city: 'Unknown', countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' }
}

function detectCityFromFilename(filename) {
    const base = path.basename(filename, path.extname(filename)).toLowerCase().replace(/\s+/g, '-')
    for (const [key, meta] of Object.entries(CITY_MAP)) {
        if (base.includes(key)) return meta
    }
    // Try original filename as city name
    const rawName = path.basename(filename, path.extname(filename))
    return { city: rawName, countryCode: 'INDIA', countryIso2: 'IN', currency: 'INR' }
}

// ─── Price Parsing ───────────────────────────────────────────────────────────

function parsePrice(text) {
    if (!text || typeof text !== 'string') return null
    const cleaned = text.replace(/,/g, '').trim()

    // Handle "₹ 1.5 Cr" / "1.5 Cr" / "₹1.5Cr" patterns
    const crMatch = cleaned.match(/([\d.]+)\s*(?:cr|crore)/i)
    if (crMatch) return Math.round(parseFloat(crMatch[1]) * 10000000)

    // Handle "₹ 50 L" / "50 Lac" / "50 Lakh" patterns  
    const lMatch = cleaned.match(/([\d.]+)\s*(?:l|lac|lakh|lakhs)/i)
    if (lMatch) return Math.round(parseFloat(lMatch[1]) * 100000)

    // Handle "₹ 5000 K" patterns
    const kMatch = cleaned.match(/([\d.]+)\s*k/i)
    if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000)

    // Handle AED patterns
    const aedMatch = cleaned.match(/(?:AED|aed)\s*([\d,.]+)/i)
    if (aedMatch) return Math.round(parseFloat(aedMatch[1].replace(/,/g, '')))

    // Plain number
    const numMatch = cleaned.match(/([\d,.]+)/)
    if (numMatch) {
        const val = parseFloat(numMatch[1].replace(/,/g, ''))
        if (Number.isFinite(val) && val > 0) return Math.round(val)
    }

    return null
}

// ─── BHK / Property Type Parsing ─────────────────────────────────────────────

function parseBedrooms(text) {
    if (!text) return 0
    // "3 & 4 BHK" → take minimum (3)
    const multiMatch = text.match(/(\d+)\s*(?:&|,|\s+and\s+)\s*\d+\s*bhk/i)
    if (multiMatch) return parseInt(multiMatch[1], 10)

    // "3 BHK" or "3BHK" or "3 Bed"
    const singleMatch = text.match(/(\d+)\s*(?:bhk|bed|br)\b/i)
    if (singleMatch) return parseInt(singleMatch[1], 10)

    return 0
}

function parsePropertyType(text) {
    if (!text) return 'Apartment'
    const lower = text.toLowerCase()
    if (lower.includes('villa')) return 'Villa'
    if (lower.includes('plot') || lower.includes('land')) return 'Plot'
    if (lower.includes('penthouse')) return 'Penthouse'
    if (lower.includes('townhouse')) return 'Townhouse'
    if (lower.includes('duplex')) return 'Duplex'
    if (lower.includes('studio')) return 'Studio'
    if (lower.includes('office') || lower.includes('commercial')) return 'Commercial'
    if (lower.includes('shop') || lower.includes('retail')) return 'Retail'
    if (lower.includes('flat') || lower.includes('apartment') || lower.includes('bhk')) return 'Apartment'
    return 'Apartment'
}

function parseConstructionStatus(text) {
    if (!text) return null
    const lower = text.toLowerCase()
    if (lower.includes('ready to move') || lower.includes('ready-to-move') || lower.includes('completed') || lower.includes('possession')) return 'READY'
    if (lower.includes('new launch') || lower.includes('under construction') || lower.includes('off plan') || lower.includes('off-plan') || lower.includes('upcoming') || lower.includes('pre-launch')) return 'OFF_PLAN'
    return null
}

function parseSquareFeet(text) {
    if (!text) return 0
    // "1200 sq ft" or "1,200 sqft" or "1200 Sq. Ft."
    const match = text.match(/([\d,]+(?:\.\d+)?)\s*(?:sq\.?\s*ft\.?|sqft|sft|square\s*feet)/i)
    if (match) return Math.round(parseFloat(match[1].replace(/,/g, '')))
    return 0
}

// ─── Community / Location Parsing ────────────────────────────────────────────

function parseCommunityFromUrl(url) {
    // Examples:
    // "lodha-alibaug-project" → Alibag
    // "kharghar-sector-36-navi-mumbai" → Kharghar Sector 36
    // "navi-mumbai-residential-property/lodha-alibaug/325516/project" 

    const urlPath = url.replace('https://www.squareyards.com/', '')

    // NPD format: "project-name-location-navi-mumbai-npd-123456"
    const npdMatch = urlPath.match(/^([^/]+)-npd-\d+$/i)
    if (npdMatch) {
        const parts = npdMatch[1].split('-')
        // Find city name markers and take the segment before city as location
        for (const [key] of Object.entries(CITY_MAP)) {
            const keyParts = key.split('-')
            const cityIdx = findSubarrayIndex(parts, keyParts)
            if (cityIdx > 0) {
                // Take parts between project name and city
                // Heuristic: first few parts are project name, parts before city are location
                const locationParts = parts.slice(Math.max(0, cityIdx - 3), cityIdx)
                    .filter(p => p.length > 1)
                return titleCase(locationParts.join(' '))
            }
        }
    }

    // Standard format: "city-residential-property/project-name/id/project"
    const stdMatch = urlPath.match(/residential-property\/([^/]+)\//i)
    if (stdMatch) {
        // The project name often contains location hints  
        return null // Will be filled from page content
    }

    return null
}

function findSubarrayIndex(arr, sub) {
    for (let i = 0; i <= arr.length - sub.length; i++) {
        if (sub.every((s, j) => arr[i + j] === s)) return i
    }
    return -1
}

function titleCase(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Developer Name Extraction ───────────────────────────────────────────────

function extractDeveloperName(title) {
    if (!title) return null
    // Common pattern: "Developer Name ProjectName Location"
    // e.g., "Lodha Alibaug" → "Lodha Group" (but we take first word as developer)
    // "K Raheja Jade City" → "K Raheja"
    // "Embassy Serenity" → "Embassy"

    const known = [
        { pattern: /\blodha\b/i, name: 'Lodha Group' },
        { pattern: /\braheja\b/i, name: 'K Raheja Corp' },
        { pattern: /\bembassy\b/i, name: 'Embassy Group' },
        { pattern: /\bgodrej\b/i, name: 'Godrej Properties' },
        { pattern: /\bmahindra\b/i, name: 'Mahindra Lifespaces' },
        { pattern: /\btata\b/i, name: 'Tata Housing' },
        { pattern: /\bprestige\b/i, name: 'Prestige Group' },
        { pattern: /\bbrigade\b/i, name: 'Brigade Group' },
        { pattern: /\bsobha\b/i, name: 'Sobha Ltd' },
        { pattern: /\bdlf\b/i, name: 'DLF' },
        { pattern: /\bhiranandani\b/i, name: 'Hiranandani Group' },
        { pattern: /\bmarathon\b/i, name: 'Marathon Group' },
        { pattern: /\bl&t\b|l\s*&\s*t|lnt\b/i, name: 'L&T Realty' },
        { pattern: /\bdamac\b/i, name: 'DAMAC Properties' },
        { pattern: /\bemaar\b/i, name: 'Emaar Properties' },
        { pattern: /\bnakheel\b/i, name: 'Nakheel' },
        { pattern: /\bmeraas\b/i, name: 'Meraas' },
        { pattern: /\bkohinoor\b/i, name: 'Kohinoor Group' },
        { pattern: /\bshapoorji\b/i, name: 'Shapoorji Pallonji' },
        { pattern: /\bgami\b/i, name: 'Gami Group' },
        { pattern: /\bhaware\b/i, name: 'Haware Group' },
        { pattern: /\bhoabl\b/i, name: 'HOABL' },
        { pattern: /\bprogressive\b/i, name: 'Progressive Group' },
        { pattern: /\bsatyam\b/i, name: 'Satyam Group' },
    ]

    for (const { pattern, name } of known) {
        if (pattern.test(title)) return name
    }

    return null
}

// ─── Core Scraper ────────────────────────────────────────────────────────────

async function fetchPage(url, retries = MAX_RETRIES) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await axios.get(url, {
                headers: HEADERS,
                timeout: 30000,
                maxRedirects: 5,
                validateStatus: (s) => s < 500,
            })
            if (res.status === 200) return res.data
            if (res.status === 404) return null
            if (res.status === 429) {
                console.log(`  ⏳ Rate limited, waiting 10s...`)
                await sleep(10000)
                continue
            }
        } catch (err) {
            if (attempt < retries) {
                console.log(`  ⚠️  Retry ${attempt + 1}/${retries}: ${err.message}`)
                await sleep(3000)
            }
        }
    }
    return null
}

async function scrapePropertyFromHtml(url, html, cityMeta) {
    const $ = cheerio.load(html)

    // ── Extract from meta tags ──
    const ogTitle = $('meta[property="og:title"]').attr('content') || ''
    const ogDesc = $('meta[property="og:description"]').attr('content') || ''
    const ogImage = $('meta[property="og:image"]').attr('content') || ''
    const metaDesc = $('meta[name="description"]').attr('content') || ''
    const pageTitle = $('title').text() || ''
    const metaKeywords = $('meta[name="keywords"]').attr('content') || ''

    // Clean title: remove "| Price List & Floor Plan" suffix and city info
    let title = ogTitle || pageTitle
    title = title
        .replace(/\|.*$/g, '')
        .replace(/\s+price\s+list.*$/i, '')
        .replace(/\s+floor\s+plan.*$/i, '')
        .replace(/,?\s*(navi\s+mumbai|mumbai|delhi|bangalore|bengaluru|pune|chennai|hyderabad|kolkata|ahmedabad|gurgaon|gurugram|noida|thane|dubai|abu\s+dhabi|sharjah)\s*$/i, '')
        .trim()

    // Description
    const description = ogDesc || metaDesc || ''

    // ── Extract from JSON-LD ──
    let jsonLdData = null
    $('script[type="application/ld+json"]').each((_, el) => {
        try {
            const parsed = JSON.parse($(el).html() || '{}')
            if (parsed['@type'] || parsed.name) {
                jsonLdData = parsed
            }
        } catch { /* ignore */ }
    })

    // ── Extract images ──
    const images = []

    // OG image as cover
    if (ogImage) {
        images.push({ url: cleanImageUrl(ogImage), category: 'COVER' })
    }

    // Preload images
    $('link[rel="preload"][as="image"]').each((_, el) => {
        const href = $(el).attr('href')
        if (href && !images.find(i => i.url === cleanImageUrl(href))) {
            images.push({ url: cleanImageUrl(href), category: 'EXTERIOR' })
        }
    })

    // ── Parse key data from description/title ──
    const bedrooms = parseBedrooms(description || title)
    const propertyType = parsePropertyType(description || title)
    const constructionStatus = parseConstructionStatus(description || title)
    const squareFeet = parseSquareFeet(description)

    // ── Parse price from page content ──
    let price = null

    // Try to find price from inline scripts or page data
    const allScripts = []
    $('script:not([src])').each((_, el) => {
        allScripts.push($(el).html() || '')
    })
    const scriptContent = allScripts.join('\n')

    // Look for price patterns in script content
    const pricePatterns = [
        /["']?(?:startingPrice|starting_price|minPrice|min_price|price)["']?\s*[:=]\s*["']?([\d,.]+(?:\s*(?:Cr|Lac|Lakh|L|K|M|B))?)/gi,
        /₹\s*([\d,.]+\s*(?:Cr|Lac|Lakh|L)?)/gi,
        /Rs\.?\s*([\d,.]+\s*(?:Cr|Lac|Lakh|L)?)/gi,
        /AED\s*([\d,.]+(?:\s*(?:K|M|B))?)/gi,
    ]

    for (const pattern of pricePatterns) {
        const match = pattern.exec(scriptContent)
        if (match) {
            const parsed = parsePrice(match[1])
            if (parsed && parsed > 100000) { // Minimum reasonable price
                price = parsed
                break
            }
        }
    }

    // Also try from visible page elements (even if SPA-rendered content might be missing)
    if (!price) {
        const priceElements = ['.price-box', '.project-price', '[class*="price"]', '.amount']
        for (const selector of priceElements) {
            const el = $(selector).first()
            if (el.length) {
                const parsed = parsePrice(el.text())
                if (parsed && parsed > 100000) {
                    price = parsed
                    break
                }
            }
        }
    }

    // ── Parse community/location ──
    let community = parseCommunityFromUrl(url)

    // Junk values to reject from community parsing
    const COMMUNITY_JUNK = ['rent', 'buy', 'sale', 'home', 'property', 'properties', 'residential', 'commercial', 'more', 'search', 'login', 'sign', 'register', 'contact']
    const isCommunityJunk = (val) => !val || val.length < 2 || COMMUNITY_JUNK.includes(val.toLowerCase().trim())

    // Try from OG title first - "Project Name Location, City" — most reliable
    if (!community && ogTitle) {
        // Pattern: "K Raheja Jade City Juinagar, Navi Mumbai"
        const locationMatch = ogTitle.match(/([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*?)\s*,\s*(?:Navi\s+Mumbai|Mumbai|Delhi|Bangalore|Bengaluru|Pune|Chennai|Hyderabad|Kolkata|Ahmedabad|Gurgaon|Gurugram|Noida|Thane|Dubai|Abu\s+Dhabi|Sharjah)/i)
        if (locationMatch) {
            // The location is the last word(s) before the city — extract it from the project title
            const fullBeforeCity = locationMatch[1].trim()
            // Split and take last 1-2 words as community (rest is project name)
            const words = fullBeforeCity.split(/\s+/)
            if (words.length >= 2) {
                // Heuristic: last 1-2 words are likely the location
                const candidate = words.slice(-1).join(' ')
                if (!isCommunityJunk(candidate)) community = candidate
                // Try last 2 words if single word is too short
                if (!community || community.length < 4) {
                    const candidate2 = words.slice(-2).join(' ')
                    if (!isCommunityJunk(candidate2)) community = candidate2
                }
            }
        }
    }

    // Fallback: try from breadcrumbs
    if (!community || isCommunityJunk(community)) {
        const breadcrumbs = []
        $('[class*="breadcrumb"] a, nav a').each((_, el) => {
            const text = $(el).text().trim()
            if (text && !isCommunityJunk(text)) breadcrumbs.push(text)
        })
        // Location is often the 2nd or 3rd breadcrumb item (skip Home, city)
        if (breadcrumbs.length > 2) {
            const candidate = breadcrumbs[breadcrumbs.length - 2]
            if (!isCommunityJunk(candidate)) community = candidate
        }
    }

    // Final cleanup
    if (isCommunityJunk(community)) community = null

    // Developer
    const developerName = extractDeveloperName(title)

    // ── Parse amenities from page ──
    const amenitiesRaw = []
    $('[class*="amenity"], [class*="amenities"] li, [class*="feature"] li').each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ')
        if (text && text.length > 2 && text.length < 50) {
            amenitiesRaw.push(text)
        }
    })

    // Deduplicate and filter junk entries
    const AMENITY_JUNK = /^\+\d+|more$/i
    const amenities = [...new Set(amenitiesRaw)].filter(a => {
        if (AMENITY_JUNK.test(a.trim())) return false
        if (a.includes('2D, 3D') || a.includes('Room-by-room') || a.includes('Vaastu compatibility') || a.includes('Interior Design Package')) return false
        return true
    })

    return {
        title: title || 'Property',
        propertyType,
        intent: 'SALE',
        price,
        currency: cityMeta.currency,
        constructionStatus,
        shortDescription: description.slice(0, 500) || null,
        bedrooms,
        bathrooms: Math.max(1, bedrooms - 1), // Estimate: typically bedrooms - 1
        squareFeet,
        countryCode: cityMeta.countryCode,
        countryIso2: cityMeta.countryIso2,
        city: cityMeta.city,
        community: community || null,
        address: community ? `${community}, ${cityMeta.city}` : cityMeta.city,
        developerName,
        amenities: amenities.length > 0 ? amenities : null,
        status: 'PUBLISHED',
        sourceUrl: url,
        sourceProvider: 'SQUAREYARDS',
    }
}

function cleanImageUrl(url) {
    if (!url) return ''
    // Remove image resizing params
    return url.split('?')[0] || url
}

// ─── Puppeteer Fallback ──────────────────────────────────────────────────────

let browserInstance = null

async function getBrowser() {
    if (browserInstance) return browserInstance
    try {
        const puppeteer = require('puppeteer-core')
        // Try common Chrome paths
        const chromePaths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        ]
        let executablePath = null
        for (const p of chromePaths) {
            if (fs.existsSync(p)) {
                executablePath = p
                break
            }
        }
        if (!executablePath) {
            console.log('  ⚠️  Chrome not found for Puppeteer fallback, skipping')
            return null
        }
        browserInstance = await puppeteer.launch({
            headless: 'new',
            executablePath,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        })
        return browserInstance
    } catch (err) {
        console.log(`  ⚠️  Puppeteer unavailable: ${err.message}`)
        return null
    }
}

async function scrapeWithPuppeteer(url, cityMeta) {
    const browser = await getBrowser()
    if (!browser) return null

    let page = null
    try {
        page = await browser.newPage()
        await page.setViewport({ width: 1280, height: 800 })
        await page.setUserAgent(HEADERS['User-Agent'])

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 })
        await sleep(3000) // Wait for SPA rendering

        const data = await page.evaluate(() => {
            const getText = (sel) => {
                const el = document.querySelector(sel)
                return el ? el.textContent.trim() : ''
            }
            const getAttr = (sel, attr) => {
                const el = document.querySelector(sel)
                return el ? el.getAttribute(attr) || '' : ''
            }

            // Title
            const title = getText('.main-heading strong') || getText('h1') || document.title

            // Price
            const priceText = getText('.price-box') || getText('[class*="price"]') || ''

            // Location
            const locationText = getText('.main-heading .location') || getText('[class*="location"]') || ''

            // Description
            const descText = getText('.description-content-box') || getText('.about-project-content') || ''

            // Amenities
            const amenities = []
            document.querySelectorAll('[class*="amenity"] li, .amenities-list li, .amenity-item').forEach(el => {
                const t = el.textContent.trim()
                if (t && t.length > 2 && t.length < 50) amenities.push(t)
            })

            // Images
            const images = []
            const ogImg = getAttr('meta[property="og:image"]', 'content')
            if (ogImg) images.push(ogImg)

            document.querySelectorAll('.project-gallery-box img, .figure img').forEach(img => {
                const src = img.getAttribute('src') || img.getAttribute('data-src') || ''
                if (src && src.startsWith('http') && !images.includes(src)) {
                    images.push(src)
                }
            })

            // BHK/Unit info
            const unitText = getText('.tab-box') || getText('[class*="unit"]') || ''

            // Tags/Status
            const tags = []
            document.querySelectorAll('.property-tag-list li').forEach(el => {
                tags.push(el.textContent.trim())
            })

            return { title, priceText, locationText, descText, amenities, images, unitText, tags }
        })

        const title = data.title
            .replace(/\|.*$/g, '')
            .replace(/\s+price\s+list.*$/i, '')
            .replace(/,?\s*(?:navi\s+mumbai|mumbai|delhi|bangalore|bengaluru|pune|chennai|hyderabad|kolkata)\s*$/i, '')
            .trim()

        const images = data.images.map((url, i) => ({
            url: cleanImageUrl(url),
            category: i === 0 ? 'COVER' : 'EXTERIOR',
        }))

        return {
            title: title || 'Property',
            propertyType: parsePropertyType(data.unitText || data.descText || title),
            intent: 'SALE',
            price: parsePrice(data.priceText),
            currency: cityMeta.currency,
            constructionStatus: parseConstructionStatus(data.tags.join(' ')),
            shortDescription: data.descText.slice(0, 500) || null,
            bedrooms: parseBedrooms(data.unitText || data.descText || title),
            bathrooms: 0,
            squareFeet: parseSquareFeet(data.descText),
            countryCode: cityMeta.countryCode,
            countryIso2: cityMeta.countryIso2,
            city: cityMeta.city,
            community: data.locationText.split(',')[0]?.trim() || parseCommunityFromUrl(url),
            address: data.locationText || cityMeta.city,
            developerName: extractDeveloperName(title),
            amenities: data.amenities.length > 0 ? data.amenities : null,
            status: 'PUBLISHED',
            sourceUrl: url,
            sourceProvider: 'SQUAREYARDS',
        }
    } catch (err) {
        console.log(`  ❌ Puppeteer failed: ${err.message}`)
        return null
    } finally {
        if (page) await page.close().catch(() => {})
    }
}

// ─── Main Orchestrator ───────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms))
}

function readUrlsFromFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8')
    return content
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && l.startsWith('http'))
}

async function processFile(filePath) {
    const filename = path.basename(filePath)
    const cityMeta = detectCityFromFilename(filePath)
    const urls = readUrlsFromFile(filePath)
    const limited = urlLimit > 0 ? urls.slice(0, urlLimit) : urls

    console.log(`\n📁 ${filename} — ${cityMeta.city} (${limited.length}/${urls.length} URLs)`)

    if (isDryRun) {
        limited.forEach((url, i) => console.log(`  ${i + 1}. ${url}`))
        return { city: cityMeta.city, properties: [], total: limited.length }
    }

    const properties = []
    const errors = []

    for (let i = 0; i < limited.length; i++) {
        const url = limited[i]
        const idx = `[${i + 1}/${limited.length}]`

        try {
            console.log(`  ${idx} Scraping: ${url.slice(0, 80)}...`)

            // Strategy 1: HTML meta tags + cheerio
            const html = await fetchPage(url)
            if (!html) {
                console.log(`  ${idx} ⚠️  Could not fetch page`)
                errors.push({ url, error: 'Fetch failed' })
                continue
            }

            let property = await scrapePropertyFromHtml(url, html, cityMeta)

            // Check if we got enough data from HTML
            const hasGoodData = property.title && property.title !== 'Property'

            // Strategy 2: Puppeteer fallback if HTML data is insufficient
            if (!hasGoodData && usePuppeteer) {
                console.log(`  ${idx} 🔄 Falling back to Puppeteer...`)
                const puppeteerData = await scrapeWithPuppeteer(url, cityMeta)
                if (puppeteerData) {
                    // Merge: prefer Puppeteer data where HTML was empty
                    property = {
                        ...property,
                        title: puppeteerData.title || property.title,
                        price: puppeteerData.price || property.price,
                        bedrooms: puppeteerData.bedrooms || property.bedrooms,
                        bathrooms: puppeteerData.bathrooms || property.bathrooms,
                        squareFeet: puppeteerData.squareFeet || property.squareFeet,
                        community: puppeteerData.community || property.community,
                        address: puppeteerData.address || property.address,
                        amenities: puppeteerData.amenities || property.amenities,
                        shortDescription: puppeteerData.shortDescription || property.shortDescription,
                        constructionStatus: puppeteerData.constructionStatus || property.constructionStatus,
                    }
                }
            }

            // Estimate bathrooms if still 0
            if (property.bathrooms === 0 && property.bedrooms > 0) {
                property.bathrooms = Math.max(1, property.bedrooms - 1)
            }

            properties.push(property)
            console.log(`  ${idx} ✅ ${property.title} — ${property.price ? `${property.currency} ${property.price.toLocaleString()}` : 'Price N/A'} — ${property.bedrooms} BHK`)

        } catch (err) {
            console.log(`  ${idx} ❌ Error: ${err.message}`)
            errors.push({ url, error: err.message })
        }

        // Rate limiting delay
        if (i < limited.length - 1) {
            await sleep(REQUEST_DELAY_MS)
        }
    }

    return { city: cityMeta.city, properties, errors, total: limited.length }
}

async function main() {
    console.log('\n🏗️  MillionFlats Property Scraper')
    console.log('═'.repeat(50))

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true })
    }

    // Determine which files to process
    let files = []
    if (singleFile) {
        const fp = path.resolve(singleFile)
        if (!fs.existsSync(fp)) {
            console.error(`❌ File not found: ${singleFile}`)
            process.exit(1)
        }
        files = [fp]
    } else {
        const allFiles = fs.readdirSync(SCRAP_DIR)
            .filter(f => f.endsWith('.txt'))
            .map(f => path.join(SCRAP_DIR, f))
        files = allFiles
    }

    if (files.length === 0) {
        console.error('❌ No .txt files found in scrap/ directory')
        process.exit(1)
    }

    console.log(`📂 Processing ${files.length} file(s)`)
    if (isDryRun) console.log('🏃 DRY RUN MODE — not scraping, just listing URLs')
    if (usePuppeteer) console.log('🌐 Puppeteer fallback enabled')
    if (urlLimit > 0) console.log(`🔢 Limit: ${urlLimit} URLs per file`)

    const allResults = []

    for (const file of files) {
        const result = await processFile(file)
        allResults.push(result)

        if (!isDryRun && result.properties.length > 0) {
            // Write output JSON
            const safeName = result.city.toLowerCase().replace(/\s+/g, '_')
            const outputPath = path.join(OUTPUT_DIR, `${safeName}_properties.json`)

            const outputJson = {
                schemaVersion: 'property-import-v1',
                systemAgentEmail: 'admin@millionflats.com',
                properties: result.properties,
            }

            fs.writeFileSync(outputPath, JSON.stringify(outputJson, null, 2), 'utf8')
            console.log(`  💾 Saved: ${outputPath}`)
        }
    }

    // Summary
    console.log('\n' + '═'.repeat(50))
    console.log('📊 SCRAPING SUMMARY')
    console.log('═'.repeat(50))

    let totalScraped = 0
    let totalErrors = 0
    let totalUrls = 0

    for (const r of allResults) {
        const scraped = r.properties?.length || 0
        const errored = r.errors?.length || 0
        totalScraped += scraped
        totalErrors += errored
        totalUrls += r.total

        if (!isDryRun) {
            console.log(`  ${r.city}: ${scraped} scraped, ${errored} errors (${r.total} total)`)
        } else {
            console.log(`  ${r.city}: ${r.total} URLs found`)
        }
    }

    if (!isDryRun) {
        console.log(`\n  Total: ${totalScraped} properties scraped, ${totalErrors} errors`)
        console.log(`  Output: ${OUTPUT_DIR}`)
        console.log(`\n💡 Import the JSON files at /admin/properties/bulk-import`)
    }

    // Cleanup
    if (browserInstance) {
        await browserInstance.close().catch(() => {})
    }
}

main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
})
