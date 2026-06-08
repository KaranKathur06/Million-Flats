export interface Property {
  id: string
  country: 'UAE' | 'India'
  title: string
  location: string
  price: number // Price in AED
  bedrooms: number
  bathrooms: number
  squareFeet: number
  images: string[]
  featured: boolean
  description: string
  propertyType: string
  yearBuilt?: number
  features: string[]
  coordinates: {
    lat: number
    lng: number
  }
  agent: {
    id: string
    name: string
    email: string
    phone: string
    avatar?: string
    bio?: string
    propertiesSold?: number
  }
}

// UAE Cities
export const UAE_CITIES = [
  'Dubai',
  'Abu Dhabi',
  'Sharjah',
  'Ajman',
  'Ras Al Khaimah',
  'Fujairah',
  'Umm Al Quwain',
] as const

export const mockProperties: Property[] = []
