const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const CATEGORIES = [
  {
    slug: 'home-loans-finance',
    title: 'Home Loans & Finance',
    description:
      'Finance your dream home with confidence—discover curated lenders, check eligibility, compare offers, and apply through MillionFlats.',
    heroImage: '/images/ecosystem/home-loans.jpg',
    metaTitle: 'Home Loans & Finance | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Finance your dream home with confidence—discover curated lenders, check eligibility, compare offers, and apply through MillionFlats.',
  },
  {
    slug: 'legal-documentation',
    title: 'Legal & Documentation',
    description:
      'Secure your property transaction with verified legal partners for due diligence, agreement drafting, and registration—only on MillionFlats.',
    heroImage: '/images/ecosystem/legal.jpg',
    metaTitle: 'Legal & Documentation | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Secure your property transaction with verified legal partners for due diligence, agreement drafting, and registration—only on MillionFlats.',
  },
  {
    slug: 'property-insurance',
    title: 'Property Insurance',
    description:
      'Find the right coverage for your home or investment with curated providers and clear, comparable policy summaries.',
    heroImage: '/images/ecosystem/insurance.jpg',
    metaTitle: 'Property Insurance | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Find the right coverage for your home or investment with curated providers and clear, comparable policy summaries.',
  },
  {
    slug: 'interior-design-renovation',
    title: 'Interior Design & Renovation',
    description:
      'Get matched with vetted designers and renovation specialists to bring your dream space to life—on time and on budget.',
    heroImage: '/images/ecosystem/interior.jpg',
    metaTitle: 'Interior Design & Renovation | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Get matched with vetted designers and renovation specialists to bring your dream space to life—on time and on budget.',
  },
  {
    slug: 'packers-movers',
    title: 'Packers & Movers',
    description:
      'Relocate smoothly with verified professionals—transparent pricing, careful handling, and dependable delivery.',
    heroImage: '/images/ecosystem/packers.jpg',
    metaTitle: 'Packers & Movers | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Relocate smoothly with verified professionals—transparent pricing, careful handling, and dependable delivery.',
  },
  {
    slug: 'property-management',
    title: 'Property Management',
    description:
      'Maximize rental income and minimize hassle—discover verified property managers, calculate net yield, and request proposals via MillionFlats.',
    heroImage: '/images/ecosystem/management.jpg',
    metaTitle: 'Property Management | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Maximize rental income and minimize hassle—discover verified property managers, calculate net yield, and request proposals via MillionFlats.',
  },
  {
    slug: 'vastu-feng-shui',
    title: 'Vastu / Feng Shui Consultants',
    description: 'Consult authentic experts to evaluate and improve harmony, wellbeing, and energy flow for your space.',
    heroImage: '/images/ecosystem/vastu.jpg',
    metaTitle: 'Vastu / Feng Shui Consultants | Ecosystem Partners | MillionFlats',
    metaDescription: 'Consult authentic experts to evaluate and improve harmony, wellbeing, and energy flow for your space.',
  },
  {
    slug: 'tiles-surface-finishing',
    title: 'Tiles & Surface Finishing',
    description:
      'Explore verified tile and surface finishing partners—compare materials, pricing bands, and installation support with clarity on MillionFlats.',
    heroImage: '/images/ecosystem/tiles.jpg',
    metaTitle: 'Tiles & Surface Finishing | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Explore verified tile and surface finishing partners—compare materials, pricing bands, and installation support with clarity on MillionFlats.',
  },
  {
    slug: 'hardware-architectural-fittings',
    title: 'Hardware & Architectural Fittings',
    description:
      'Find verified partners for hardware and architectural fittings—clear specifications, pricing bands, and dependable sourcing on MillionFlats.',
    heroImage: '/images/ecosystem/hardware.jpg',
    metaTitle: 'Hardware & Architectural Fittings | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Find verified partners for hardware and architectural fittings—clear specifications, pricing bands, and dependable sourcing on MillionFlats.',
  },
  {
    slug: 'cement-structural',
    title: 'Cement & Structural',
    description:
      'Connect with verified cement and structural material partners—transparent pricing, reliable delivery, and project-ready support on MillionFlats.',
    heroImage: '/images/ecosystem/cement.jpg',
    metaTitle: 'Cement & Structural | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Connect with verified cement and structural material partners—transparent pricing, reliable delivery, and project-ready support on MillionFlats.',
  },
  {
    slug: 'smart-home-automation',
    title: 'Smart Home & Automation',
    description:
      'Explore verified smart home and automation partners—supported brands, installation, and AMC options with clear proposals on MillionFlats.',
    heroImage: '/images/ecosystem/smart-home.jpg',
    metaTitle: 'Smart Home & Automation | Ecosystem Partners | MillionFlats',
    metaDescription:
      'Explore verified smart home and automation partners—supported brands, installation, and AMC options with clear proposals on MillionFlats.',
  },
]

async function main() {
  for (const c of CATEGORIES) {
    await prisma.ecosystemCategory.upsert({
      where: { slug: c.slug },
      update: {
        title: c.title,
        description: c.description,
        heroImage: c.heroImage,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
        isActive: true,
      },
      create: {
        slug: c.slug,
        title: c.title,
        description: c.description,
        heroImage: c.heroImage,
        metaTitle: c.metaTitle,
        metaDescription: c.metaDescription,
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
