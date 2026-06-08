// ━━━ VerixShield Market Data Seed ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Seeds the database with UAE market listing data for the valuation engine
// Usage: npx tsx scripts/seed-market-data.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ── Dubai communities with realistic market data ──
const COMMUNITIES = [
  { name: 'Dubai Marina', city: 'Dubai', lat: 25.0777, lng: 55.1342, tier: 'premium' },
  { name: 'Palm Jumeirah', city: 'Dubai', lat: 25.1124, lng: 55.1390, tier: 'ultra' },
  { name: 'Downtown Dubai', city: 'Dubai', lat: 25.1972, lng: 55.2744, tier: 'ultra' },
  { name: 'Business Bay', city: 'Dubai', lat: 25.1870, lng: 55.2617, tier: 'premium' },
  { name: 'JVC', city: 'Dubai', lat: 25.0630, lng: 55.2110, tier: 'affordable' },
  { name: 'Dubai Hills Estate', city: 'Dubai', lat: 25.1350, lng: 55.2297, tier: 'premium' },
  { name: 'Dubai Creek Harbour', city: 'Dubai', lat: 25.2048, lng: 55.3461, tier: 'premium' },
  { name: 'JLT', city: 'Dubai', lat: 25.0795, lng: 55.1490, tier: 'mid' },
  { name: 'Motor City', city: 'Dubai', lat: 25.0490, lng: 55.2340, tier: 'affordable' },
  { name: 'Sports City', city: 'Dubai', lat: 25.0380, lng: 55.2250, tier: 'affordable' },
  { name: 'Arjan', city: 'Dubai', lat: 25.0575, lng: 55.2400, tier: 'affordable' },
  { name: 'Al Barsha', city: 'Dubai', lat: 25.1093, lng: 55.1980, tier: 'mid' },
  { name: 'Meydan', city: 'Dubai', lat: 25.1635, lng: 55.3005, tier: 'premium' },
  { name: 'Sobha Hartland', city: 'Dubai', lat: 25.1775, lng: 55.3200, tier: 'premium' },
  { name: 'Damac Hills', city: 'Dubai', lat: 25.0264, lng: 55.2520, tier: 'mid' },
  { name: 'Town Square', city: 'Dubai', lat: 25.0042, lng: 55.2670, tier: 'affordable' },
  { name: 'International City', city: 'Dubai', lat: 25.1670, lng: 55.4050, tier: 'budget' },
  { name: 'Discovery Gardens', city: 'Dubai', lat: 25.0400, lng: 55.1330, tier: 'budget' },
  { name: 'Dubai South', city: 'Dubai', lat: 24.9100, lng: 55.1600, tier: 'affordable' },
  { name: 'MBR City', city: 'Dubai', lat: 25.1610, lng: 55.3150, tier: 'premium' },
]

// ── Price ranges per sqft by tier (AED) ──
const TIER_RATES: Record<string, { min: number; max: number }> = {
  ultra: { min: 1800, max: 3500 },
  premium: { min: 1200, max: 2200 },
  mid: { min: 900, max: 1500 },
  affordable: { min: 650, max: 1100 },
  budget: { min: 400, max: 750 },
}

// ── BHK configurations ──
const BHK_CONFIGS = [
  { bhk: 0, label: 'Studio', sqftRange: [350, 550] },
  { bhk: 1, label: '1 BHK', sqftRange: [600, 950] },
  { bhk: 2, label: '2 BHK', sqftRange: [900, 1400] },
  { bhk: 3, label: '3 BHK', sqftRange: [1300, 2200] },
  { bhk: 4, label: '4 BHK', sqftRange: [1800, 3200] },
  { bhk: 5, label: '5 BHK', sqftRange: [2500, 4500] },
]

const PROPERTY_TYPES = ['Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Duplex']
const FURNISHED_OPTIONS = ['Furnished', 'Semi-Furnished', 'Unfurnished']

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateFingerprint(community: string, bhk: number, sqft: number, price: number): string {
  return `${community}-${bhk}-${Math.round(sqft)}-${Math.round(price)}`.replace(/\s+/g, '-').toLowerCase()
}

async function seed() {
  console.log('🛡️  VerixShield Market Data Seed')
  console.log('━'.repeat(50))

  // ── Seed MarketListings ──
  console.log('\n📊 Seeding market listings...')
  let listingCount = 0

  for (const community of COMMUNITIES) {
    const tier = community.tier as keyof typeof TIER_RATES
    const rates = TIER_RATES[tier]
    const listingsPerCommunity = randomInt(15, 35)

    for (let i = 0; i < listingsPerCommunity; i++) {
      const bhkConfig = randomElement(BHK_CONFIGS)
      const sqft = randomBetween(bhkConfig.sqftRange[0], bhkConfig.sqftRange[1])
      const pricePerSqft = randomBetween(rates.min, rates.max)

      // Adjust price based on BHK (studios slightly more per sqft, larger units slightly less)
      const bhkMultiplier = bhkConfig.bhk === 0 ? 1.1 : bhkConfig.bhk <= 2 ? 1.0 : 0.95
      const adjustedPricePerSqft = pricePerSqft * bhkMultiplier
      const price = Math.round(adjustedPricePerSqft * sqft)

      // Villa/townhouse are only for 3+ BHK
      let propertyType = 'Apartment'
      if (bhkConfig.bhk >= 3) {
        propertyType = randomElement(PROPERTY_TYPES)
      } else if (bhkConfig.bhk === 0) {
        propertyType = 'Apartment'
      }

      // Add some geographic scatter
      const latJitter = randomBetween(-0.01, 0.01)
      const lngJitter = randomBetween(-0.01, 0.01)

      const listedDaysAgo = randomInt(1, 180)
      const listedAt = new Date(Date.now() - listedDaysAgo * 24 * 60 * 60 * 1000)

      const fingerprint = generateFingerprint(community.name, bhkConfig.bhk, sqft, price)

      try {
        await prisma.marketListing.create({
          data: {
            city: community.city,
            community: community.name,
            latitude: community.lat + latJitter,
            longitude: community.lng + lngJitter,
            propertyType,
            bhk: bhkConfig.bhk,
            sqft: Math.round(sqft),
            price,
            pricePerSqft: Math.round(adjustedPricePerSqft),
            currency: 'AED',
            source: 'INTERNAL',
            title: `${bhkConfig.label} ${propertyType} in ${community.name}`,
            isActive: true,
            listedAt,
            floor: propertyType === 'Apartment' ? randomInt(1, 50) : null,
            totalFloors: propertyType === 'Apartment' ? randomInt(20, 60) : null,
            furnished: randomElement(FURNISHED_OPTIONS),
            propertyAge: randomInt(0, 15),
            fingerprint,
          },
        })
        listingCount++
      } catch {
        // Skip duplicates
      }
    }

    process.stdout.write(`  ✓ ${community.name}: ${listingsPerCommunity} listings\n`)
  }

  console.log(`\n  Total listings created: ${listingCount}`)

  // ── Seed PropertyTransactions ──
  console.log('\n📈 Seeding property transactions...')
  let transactionCount = 0

  for (const community of COMMUNITIES) {
    const tier = community.tier as keyof typeof TIER_RATES
    const rates = TIER_RATES[tier]
    const txPerCommunity = randomInt(8, 20)

    for (let i = 0; i < txPerCommunity; i++) {
      const bhkConfig = randomElement(BHK_CONFIGS)
      const sqft = randomBetween(bhkConfig.sqftRange[0], bhkConfig.sqftRange[1])
      const pricePerSqft = randomBetween(rates.min, rates.max) * 0.95 // Sold prices slightly lower
      const soldPrice = Math.round(pricePerSqft * sqft)

      const soldDaysAgo = randomInt(30, 365)
      const soldDate = new Date(Date.now() - soldDaysAgo * 24 * 60 * 60 * 1000)

      let propertyType = 'Apartment'
      if (bhkConfig.bhk >= 3) propertyType = randomElement(PROPERTY_TYPES)

      try {
        await prisma.propertyTransaction.create({
          data: {
            city: community.city,
            community: community.name,
            latitude: community.lat + randomBetween(-0.005, 0.005),
            longitude: community.lng + randomBetween(-0.005, 0.005),
            propertyType,
            bhk: bhkConfig.bhk,
            sqft: Math.round(sqft),
            soldPrice,
            pricePerSqft: Math.round(pricePerSqft),
            currency: 'AED',
            soldDate,
            source: 'INTERNAL',
          },
        })
        transactionCount++
      } catch {
        // Skip
      }
    }
  }

  console.log(`  Total transactions created: ${transactionCount}`)

  // ── Seed PriceTrends ──
  console.log('\n📉 Seeding price trends...')
  let trendCount = 0

  const now = new Date()
  for (const community of COMMUNITIES) {
    const tier = community.tier as keyof typeof TIER_RATES
    const rates = TIER_RATES[tier]
    const baseRate = (rates.min + rates.max) / 2

    for (let monthsBack = 11; monthsBack >= 0; monthsBack--) {
      const date = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1)
      const month = date.getMonth() + 1
      const year = date.getFullYear()
      const periodKey = `${year}-${String(month).padStart(2, '0')}`

      // Apply growth trend (5-8% YoY)
      const growthFactor = Math.pow(1.006, 12 - monthsBack)
      const noise = 1 + randomBetween(-0.02, 0.02)
      const avgPricePerSqft = Math.round(baseRate * growthFactor * noise)

      const totalListings = randomInt(10, 60)
      const totalTransactions = randomInt(3, 15)
      const medianPrice = Math.round(avgPricePerSqft * randomBetween(900, 1200))

      try {
        await prisma.priceTrend.create({
          data: {
            city: community.city,
            community: community.name,
            month,
            year,
            periodKey,
            avgPricePerSqft,
            medianPrice,
            totalListings,
            totalTransactions,
            priceChangePercent: monthsBack < 11 ? randomBetween(-2, 3) : null,
          },
        })
        trendCount++
      } catch {
        // Skip duplicates
      }
    }
  }

  console.log(`  Total trend records created: ${trendCount}`)

  // ── Seed MarketSignals ──
  console.log('\n📡 Seeding market signals...')
  let signalCount = 0

  for (const community of COMMUNITIES) {
    const isPremium = ['ultra', 'premium'].includes(community.tier)

    try {
      await prisma.marketSignal.create({
        data: {
          city: community.city,
          community: community.name,
          demandScore: isPremium ? randomBetween(65, 90) : randomBetween(40, 70),
          supplyScore: isPremium ? randomBetween(30, 55) : randomBetween(45, 75),
          listingVelocity: isPremium ? randomBetween(12, 25) : randomBetween(5, 15),
          avgDaysOnMarket: isPremium ? randomBetween(25, 50) : randomBetween(40, 90),
          inventoryMonths: isPremium ? randomBetween(2, 5) : randomBetween(4, 8),
          priceToRentRatio: isPremium ? randomBetween(20, 28) : randomBetween(14, 22),
          dataPointCount: randomInt(30, 200),
        },
      })
      signalCount++
    } catch {
      // Skip
    }
  }

  console.log(`  Total signal records created: ${signalCount}`)

  console.log('\n' + '━'.repeat(50))
  console.log('✅ VerixShield market data seeding complete!')
  console.log(`   Listings:     ${listingCount}`)
  console.log(`   Transactions: ${transactionCount}`)
  console.log(`   Trends:       ${trendCount}`)
  console.log(`   Signals:      ${signalCount}`)
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
