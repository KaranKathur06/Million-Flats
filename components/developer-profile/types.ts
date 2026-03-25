export type DeveloperProjectCard = {
  id: string
  name: string
  slug: string
  image: string
  location: string
  startingPrice?: string | null
  status?: string | null
  tag?: string | null
}

export type DeveloperProfileData = {
  name: string
  slug: string
  logo: string
  banner: string
  tagline: string
  description: string
  shortDescription: string | null
  city: string
  country: string
  founded_year: number | null
  specialization: string
  website: string | null
  verified: boolean
  stats: {
    projects: number
    cities: number
    experience: number
    startingPriceRange?: string | null
  }
  projects: DeveloperProjectCard[]
}
