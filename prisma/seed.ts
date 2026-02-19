import { PrismaClient } from '@prisma/client'
import { ECOSYSTEM_CATEGORY_CONFIG } from '../lib/ecosystem/categoryConfig'

const prisma = new PrismaClient()

async function main() {
  for (const cfg of Object.values(ECOSYSTEM_CATEGORY_CONFIG)) {
    await prisma.ecosystemCategory.upsert({
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
