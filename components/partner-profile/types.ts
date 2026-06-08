export type PartnerWhyChooseItem = {
  title: string
  description: string
}

export type PartnerProcessStep = {
  step: number
  title: string
  description: string
}

export type PartnerServiceItem = {
  id: string
  name: string
  description: string | null
}

export type PartnerLocationItem = {
  id: string
  city: string
  region: string | null
  isPrimary: boolean
}

export type PartnerPortfolioItem = {
  id: string
  projectName: string
  location: string | null
  projectSize: string | null
  completionDate: string | null
  style: string | null
  budgetRange: string | null
  projectType: string | null
  description: string | null
  coverImage: string
  images: string[]
}

export type PartnerReviewItem = {
  id: string
  reviewerName: string
  location: string | null
  projectType: string | null
  review: string
  rating: number | null
}

export type PartnerFaqItem = {
  id: string
  question: string
  answer: string
}

export type PartnerGalleryItem = {
  id: string
  imageUrl: string
  caption: string | null
  category: string | null
}

export type PartnerProfileData = {
  id: string
  name: string
  slug: string
  categorySlug: string
  categoryTitle: string
  logo: string
  coverImage: string
  tagline: string
  description: string
  shortDescription: string | null
  verified: boolean
  partnerSince: number | null
  locationCoverage: string | null
  pricingRange: string | null

  stats: {
    projectsCompleted: number | null
    experience: number | null
    rating: number | null
    teamSize: number | null
  }

  whyChoose: PartnerWhyChooseItem[]
  workProcess: PartnerProcessStep[]
  services: PartnerServiceItem[]
  locations: PartnerLocationItem[]
  portfolios: PartnerPortfolioItem[]
  reviews: PartnerReviewItem[]
  faqs: PartnerFaqItem[]
  gallery: PartnerGalleryItem[]
}
