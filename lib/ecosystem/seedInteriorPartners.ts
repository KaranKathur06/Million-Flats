import { prisma } from '@/lib/prisma'

const PARTNERS = [
  {
    slug: 'studio-elemento',
    name: 'Studio Elemento',
    tagline: 'Modern Contemporary interiors with architectural precision.',
    shortDescription: 'Modern Contemporary design studio specializing in luxury residences.',
    locationCoverage: 'Delhi NCR, Mumbai, Bangalore',
    rating: 4.8,
    yearsExperience: 12,
    projectsCompleted: 250,
    teamSize: 50,
    partnerSince: 2020,
    pricingRange: '₹15L - ₹50L',
    coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200',
    logo: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=200',
    isFeatured: true,
    isVerified: true,
    locations: ['Delhi NCR', 'Mumbai', 'Bangalore'],
    portfolios: [
      {
        projectName: 'Golf Course Villa',
        location: 'Gurgaon',
        projectType: 'Luxury Villas',
        style: 'Modern Contemporary',
        budgetRange: '₹45L - ₹60L',
        completionDate: '2024',
        projectSize: '4,500 sq.ft.',
        coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800',
      },
      {
        projectName: 'Skyline Penthouse',
        location: 'Mumbai',
        projectType: 'Modern Apartments',
        style: 'Contemporary',
        budgetRange: '₹25L - ₹35L',
        completionDate: '2025',
        projectSize: '2,800 sq.ft.',
        coverImage: 'https://images.unsplash.com/photo-1600607687644-aac4c153115f?auto=format&fit=crop&q=80&w=800',
      },
    ],
    reviews: [
      {
        reviewerName: 'Priya Sharma',
        location: 'Gurgaon',
        projectType: 'Villa Interiors',
        review: 'Studio Elemento transformed our villa with exceptional attention to detail. The 3D previews matched the final outcome perfectly.',
        rating: 5,
      },
    ],
  },
  {
    slug: 'livspace-interiors',
    name: 'Livspace Interiors',
    tagline: 'Pan-India turnkey execution at scale.',
    shortDescription: 'Turnkey interior solutions with end-to-end project management.',
    locationCoverage: 'Pan India',
    rating: 4.7,
    yearsExperience: 10,
    projectsCompleted: 500,
    teamSize: 120,
    partnerSince: 2019,
    pricingRange: '₹5L - ₹50L',
    coverImage: 'https://images.unsplash.com/photo-1600607687644-aac4c153115f?auto=format&fit=crop&q=80&w=1200',
    logo: 'https://images.unsplash.com/photo-1600607687644-aac4c153115f?auto=format&fit=crop&q=80&w=200',
    isFeatured: true,
    isVerified: true,
    locations: ['Pan India'],
    portfolios: [
      {
        projectName: 'Urban Loft',
        location: 'Bangalore',
        projectType: 'Modern Apartments',
        style: 'Industrial Modern',
        budgetRange: '₹18L - ₹22L',
        coverImage: 'https://images.unsplash.com/photo-1598928506311-c55dd5e8e32b?auto=format&fit=crop&q=80&w=800',
      },
    ],
    reviews: [],
  },
  {
    slug: 'designcafe',
    name: 'DesignCafe',
    tagline: 'Space optimisation for modern Indian homes.',
    shortDescription: 'Smart space planning and modular interior solutions.',
    locationCoverage: 'Mumbai, Pune, Bangalore',
    rating: 4.6,
    yearsExperience: 8,
    projectsCompleted: 180,
    teamSize: 40,
    partnerSince: 2021,
    pricingRange: '₹5L - ₹25L',
    coverImage: 'https://images.unsplash.com/photo-1598928506311-c55dd5e8e32b?auto=format&fit=crop&q=80&w=1200',
    isVerified: true,
    locations: ['Mumbai', 'Pune', 'Bangalore'],
    portfolios: [],
    reviews: [],
  },
  {
    slug: 'bonito-designs',
    name: 'Bonito Designs',
    tagline: 'Bespoke luxury interiors crafted to perfection.',
    shortDescription: 'Premium bespoke design for luxury homes.',
    locationCoverage: 'Bangalore, Hyderabad',
    rating: 4.9,
    yearsExperience: 14,
    projectsCompleted: 320,
    teamSize: 65,
    partnerSince: 2018,
    pricingRange: '₹50L - ₹1Cr+',
    coverImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=1200',
    isFeatured: true,
    isVerified: true,
    locations: ['Bangalore', 'Hyderabad'],
    portfolios: [],
    reviews: [],
  },
  {
    slug: 'urban-ladder-tech',
    name: 'Urban Ladder Tech',
    tagline: 'Modular finishes with tech-enabled design.',
    shortDescription: 'Modular furniture and smart interior finishes.',
    locationCoverage: 'Hyderabad, Chennai, Bangalore',
    rating: 4.5,
    yearsExperience: 7,
    projectsCompleted: 150,
    teamSize: 35,
    partnerSince: 2022,
    pricingRange: '₹5L - ₹15L',
    coverImage: 'https://images.unsplash.com/photo-1556817411-31ae72fa3ea8?auto=format&fit=crop&q=80&w=1200',
    isVerified: true,
    locations: ['Hyderabad', 'Chennai', 'Bangalore'],
    portfolios: [],
    reviews: [],
  },
  {
    slug: 'aura-aesthetics',
    name: 'Aura Aesthetics',
    tagline: 'Minimalist Scandinavian elegance for urban living.',
    shortDescription: 'Scandinavian-inspired minimalist interior design.',
    locationCoverage: 'Pune, Mumbai',
    rating: 4.8,
    yearsExperience: 9,
    projectsCompleted: 95,
    teamSize: 22,
    partnerSince: 2023,
    pricingRange: '₹15L - ₹40L',
    coverImage: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&q=80&w=1200',
    isVerified: true,
    locations: ['Pune', 'Mumbai'],
    portfolios: [],
    reviews: [],
  },
]

export async function seedInteriorDesignPartners() {
  const category = await (prisma as any).ecosystemCategory.findUnique({
    where: { slug: 'interior-design-renovation' },
  })
  if (!category) {
    console.warn('interior-design-renovation category not found — skip partner seed')
    return
  }

  for (const p of PARTNERS) {
    const existing = await (prisma as any).ecosystemPartner.findFirst({
      where: { categoryId: category.id, slug: p.slug },
    })

    const data = {
      categoryId: category.id,
      name: p.name,
      slug: p.slug,
      tagline: p.tagline,
      shortDescription: p.shortDescription,
      description: `${p.name} is a verified MillionFlats ecosystem partner delivering premium ${p.shortDescription?.toLowerCase() || 'interior design services'} across India.`,
      locationCoverage: p.locationCoverage,
      rating: p.rating,
      yearsExperience: p.yearsExperience,
      projectsCompleted: p.projectsCompleted,
      teamSize: p.teamSize,
      partnerSince: p.partnerSince,
      pricingRange: p.pricingRange,
      coverImage: p.coverImage,
      logo: p.logo || p.coverImage,
      status: 'APPROVED',
      isActive: true,
      isFeatured: p.isFeatured || false,
      isVerified: p.isVerified || false,
      contactEmail: `${p.slug}@partners.millionflats.local`,
    }

    const partner = existing
      ? await (prisma as any).ecosystemPartner.update({ where: { id: existing.id }, data })
      : await (prisma as any).ecosystemPartner.create({ data })

    const partnerId = partner.id

    if (p.locations?.length) {
      await (prisma as any).ecosystemPartnerLocation.deleteMany({ where: { partnerId } })
      await (prisma as any).ecosystemPartnerLocation.createMany({
        data: p.locations.map((city, i) => ({
          partnerId,
          city,
          isPrimary: i === 0,
          sortOrder: i,
        })),
      })
    }

    if (p.portfolios?.length) {
      await (prisma as any).ecosystemPartnerPortfolio.deleteMany({ where: { partnerId } })
      for (const [i, port] of p.portfolios.entries()) {
        await (prisma as any).ecosystemPartnerPortfolio.create({
          data: {
            partnerId,
            projectName: port.projectName,
            location: port.location,
            projectType: port.projectType,
            style: port.style,
            budgetRange: port.budgetRange,
            completionDate: (port as { completionDate?: string }).completionDate,
            projectSize: (port as { projectSize?: string }).projectSize,
            coverImage: port.coverImage,
            images: [port.coverImage],
            sortOrder: i,
          },
        })
      }
    }

    if (p.reviews?.length) {
      await (prisma as any).ecosystemPartnerReview.deleteMany({ where: { partnerId } })
      for (const [i, rev] of p.reviews.entries()) {
        await (prisma as any).ecosystemPartnerReview.create({
          data: {
            partnerId,
            reviewerName: rev.reviewerName,
            location: rev.location,
            projectType: rev.projectType,
            review: rev.review,
            rating: rev.rating,
            isApproved: true,
            isFeatured: i === 0,
            sortOrder: i,
          },
        })
      }
    }

    const serviceNames = [
      'Space Planning',
      'Interior Design',
      'Turnkey Execution',
      'Renovation',
      '3D Visualization',
      'Project Management',
    ]
    const svcCount = await (prisma as any).ecosystemPartnerService.count({ where: { partnerId } })
    if (svcCount === 0) {
      await (prisma as any).ecosystemPartnerService.createMany({
        data: serviceNames.map((name, i) => ({ partnerId, name, sortOrder: i })),
      })
    }
  }

  console.log(`Seeded ${PARTNERS.length} interior design partners`)
}
