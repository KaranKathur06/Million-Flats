import { PrismaClient } from '@prisma/client'
import { ECOSYSTEM_CATEGORY_CONFIG } from '../lib/ecosystem/categoryConfig'
import { seedInteriorDesignPartners } from '../lib/ecosystem/seedInteriorPartners'

const prisma = new PrismaClient()

async function seedMarketAndCityPriorities() {
  // Seed Market Priorities (global market ordering)
  const marketPriorities = [
    { countryIso2: 'AE', priority: 1, label: 'UAE (Primary Market)' },
    { countryIso2: 'IN', priority: 2, label: 'India (Secondary Market)' },
    { countryIso2: 'SA', priority: 3, label: 'Saudi Arabia' },
  ]

  for (const market of marketPriorities) {
    await (prisma as any).marketPriority.upsert({
      where: { countryIso2: market.countryIso2 },
      update: {
        priority: market.priority,
        isActive: true,
      },
      create: {
        countryIso2: market.countryIso2,
        priority: market.priority,
        isActive: true,
      },
    })
  }

  // Seed City Priorities (within each market)
  const cityPriorities = [
    // UAE cities
    { countryIso2: 'AE', cityName: 'Dubai', priority: 1 },
    { countryIso2: 'AE', cityName: 'Abu Dhabi', priority: 2 },
    { countryIso2: 'AE', cityName: 'Sharjah', priority: 3 },
    { countryIso2: 'AE', cityName: 'Ras Al Khaimah', priority: 4 },
    { countryIso2: 'AE', cityName: 'Ajman', priority: 5 },
    // India cities
    { countryIso2: 'IN', cityName: 'Mumbai', priority: 1 },
    { countryIso2: 'IN', cityName: 'Bangalore', priority: 2 },
    { countryIso2: 'IN', cityName: 'Hyderabad', priority: 3 },
    { countryIso2: 'IN', cityName: 'Delhi', priority: 4 },
    { countryIso2: 'IN', cityName: 'Pune', priority: 5 },
  ]

  for (const city of cityPriorities) {
    await (prisma as any).cityPriority.upsert({
      where: {
        countryIso2_cityName: {
          countryIso2: city.countryIso2,
          cityName: city.cityName,
        },
      },
      update: {
        priority: city.priority,
        isActive: true,
      },
      create: {
        countryIso2: city.countryIso2,
        cityName: city.cityName,
        priority: city.priority,
        isActive: true,
      },
    })
  }

  console.log('✓ Market and City Priorities seeded')
}

async function main() {
  // Seed market and city priorities first
  await seedMarketAndCityPriorities()

  for (const cfg of Object.values(ECOSYSTEM_CATEGORY_CONFIG)) {
    await (prisma as any).ecosystemCategory.upsert({
      where: { slug: cfg.slug },
      update: {
        title: cfg.title,
        description: cfg.meta.description,
        heroImage: cfg.heroImage.src,
        metaTitle: cfg.meta.title,
        metaDescription: cfg.meta.description,
        isActive: true,
      },
      create: {
        slug: cfg.slug,
        title: cfg.title,
        description: cfg.meta.description,
        heroImage: cfg.heroImage.src,
        metaTitle: cfg.meta.title,
        metaDescription: cfg.meta.description,
        priorityOrder: 0,
        isActive: true,
      },
    })
  }

  await seedInteriorDesignPartners()
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
