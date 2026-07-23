export type DeveloperProjectCard = {
  id: string
  name: string
  slug: string
  image: string
  location: string
  startingPrice?: string | null
  status?: string | null
  completionYear?: number | null
  goldenVisa?: boolean
  tag?: string | null
}

export type DeveloperAchievementItem = {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  awardDate: string | null
}

export type DeveloperFaqItem = {
  id: string
  question: string
  answer: string
}

export type DeveloperGalleryItem = {
  id: string
  imageUrl: string
  caption: string | null
  category: string | null
}

export type DeveloperProfileData = {
  name: string
  slug: string
  logo: string
  banner: string
  /** True when developer.banner resolves to a CDN URL (not synthesized from projects) */
  hasCustomBanner?: boolean
  tagline: string
  description: string
  shortDescription: string | null
  city: string
  country: string
  founded_year: number | null
  specialization: string
  website: string | null
  verified: boolean

  // Extended fields
  headquarters: string | null
  email: string | null
  phone: string | null
  address: string | null
  brochureUrl: string | null

  // Social links
  socialLinks: {
    facebook: string | null
    instagram: string | null
    linkedin: string | null
    youtube: string | null
  }

  // Trust & rating
  customerRating: number | null
  projectsDelivered: number | null
  countriesPresent: number | null
  aiScore: number | null

  stats: {
    projects: number
    cities: number
    experience: number
    startingPriceRange?: string | null
    totalInquiries?: number
  }

  projects: DeveloperProjectCard[]
  achievements: DeveloperAchievementItem[]
  faqs: DeveloperFaqItem[]
  gallery: DeveloperGalleryItem[]
}
