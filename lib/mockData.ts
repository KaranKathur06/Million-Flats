export interface Property {
  id: string
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

export const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Luxury Penthouse in Downtown Dubai',
    location: 'Dubai',
    price: 9200000, // AED 9.2M
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 3500,
    images: [
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
    ],
    featured: true,
    description: 'Stunning luxury penthouse in the heart of Downtown Dubai with breathtaking views of Burj Khalifa and Dubai Fountain. This exceptional property features floor-to-ceiling windows, high-end finishes, and world-class amenities. The open-concept living space is perfect for entertaining, while the private terrace offers a serene escape with panoramic city views.',
    propertyType: 'Penthouse',
    yearBuilt: 2020,
    features: ['Burj Khalifa Views', 'Private Terrace', 'High-End Finishes', 'Concierge Service', 'Valet Parking', 'Gym & Spa Access'],
    coordinates: { lat: 25.1972, lng: 55.2744 },
    agent: {
      id: '1',
      name: 'Ahmed Al Maktoum',
      email: 'ahmed.almaktoum@millionflats.com',
      phone: '+971 4 555 0101',
      bio: 'Luxury real estate specialist with 15+ years of experience in Dubai premium properties.',
      propertiesSold: 127,
    },
  },
  {
    id: '2',
    title: 'Beachfront Villa with Private Pool',
    location: 'Dubai',
    price: 19500000, // AED 19.5M
    bedrooms: 5,
    bathrooms: 4,
    squareFeet: 6000,
    images: [
      'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1200&q=80',
    ],
    featured: true,
    description: 'Exclusive beachfront villa on Palm Jumeirah offering direct access to pristine white sand beaches. This magnificent property boasts a private infinity pool, spacious outdoor entertaining areas, and panoramic Arabian Gulf views. The interior features contemporary design with premium materials throughout, including Italian marble and custom finishes.',
    propertyType: 'Villa',
    yearBuilt: 2018,
    features: ['Beachfront', 'Private Pool', 'Gulf Views', 'Outdoor Kitchen', 'Private Beach Access', 'Boat Dock'],
    coordinates: { lat: 25.1124, lng: 55.1390 },
    agent: {
      id: '2',
      name: 'Fatima Al Zaabi',
      email: 'fatima.alzaabi@millionflats.com',
      phone: '+971 4 555 0102',
      bio: 'Dubai luxury real estate expert specializing in waterfront properties and Palm Jumeirah.',
      propertiesSold: 89,
    },
  },
  {
    id: '3',
    title: 'Modern Minimalist Mansion',
    location: 'Abu Dhabi',
    price: 14200000, // AED 14.2M
    bedrooms: 6,
    bathrooms: 5,
    squareFeet: 8000,
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80',
    ],
    featured: true,
    description: 'Architectural masterpiece showcasing minimalist design at its finest. This stunning mansion in Al Saadiyat Island features clean lines, expansive glass walls, and seamless indoor-outdoor living. The property includes a state-of-the-art home theater, wine cellar, and resort-style pool area with views of the Arabian Gulf.',
    propertyType: 'Mansion',
    yearBuilt: 2021,
    features: ['Minimalist Design', 'Home Theater', 'Wine Cellar', 'Resort Pool', 'Smart Home', 'Gulf Views'],
    coordinates: { lat: 24.4539, lng: 54.3773 },
    agent: {
      id: '3',
      name: 'Mohammed Al Mansoori',
      email: 'mohammed.almansoori@millionflats.com',
      phone: '+971 2 555 0103',
      bio: 'Luxury property specialist in Abu Dhabi, specializing in Al Saadiyat and Yas Island properties.',
      propertiesSold: 156,
    },
  },
  {
    id: '4',
    title: 'Elegant Villa in Al Reem Island',
    location: 'Abu Dhabi',
    price: 11800000, // AED 11.8M
    bedrooms: 5,
    bathrooms: 4,
    squareFeet: 4500,
    images: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687644-c7171b42498b?w=1200&q=80',
    ],
    featured: false,
    description: 'Elegant contemporary villa in the prestigious Al Reem Island. This beautifully designed property offers timeless elegance and contemporary comfort with stunning waterfront views. Features include a private garden, rooftop terrace, and access to world-class amenities.',
    propertyType: 'Villa',
    yearBuilt: 2019,
    features: ['Waterfront Views', 'Private Garden', 'Rooftop Terrace', 'Modern Amenities', 'Prime Location', 'Marina Access'],
    coordinates: { lat: 24.5089, lng: 54.3850 },
    agent: {
      id: '4',
      name: 'Khalid Al Dhaheri',
      email: 'khalid.aldhaheri@millionflats.com',
      phone: '+971 2 555 0104',
      bio: 'Abu Dhabi real estate expert specializing in premium island properties.',
      propertiesSold: 98,
    },
  },
  {
    id: '5',
    title: 'Luxury Apartment in Business Bay',
    location: 'Dubai',
    price: 5900000, // AED 5.9M
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 2200,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
    ],
    featured: false,
    description: 'Sophisticated luxury apartment in Dubai\'s prestigious Business Bay district. Features modern design with premium finishes and stunning city views. Located in a world-class development with access to Dubai Canal and proximity to Downtown Dubai.',
    propertyType: 'Apartment',
    yearBuilt: 2019,
    features: ['City Views', 'Modern Design', 'Premium Finishes', 'Concierge', 'Valet Parking', 'Canal Views'],
    coordinates: { lat: 25.1868, lng: 55.2668 },
    agent: {
      id: '5',
      name: 'Layla Al Suwaidi',
      email: 'layla.alsuwaidi@millionflats.com',
      phone: '+971 4 555 0105',
      bio: 'Dubai luxury apartment specialist with expertise in Business Bay and Downtown.',
      propertiesSold: 67,
    },
  },
  {
    id: '6',
    title: 'Waterfront Penthouse with Marina Views',
    location: 'Dubai',
    price: 12500000, // AED 12.5M
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 3800,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80',
    ],
    featured: false,
    description: 'Spectacular penthouse with unobstructed views of Dubai Marina and the Arabian Gulf. This exceptional property offers the ultimate in luxury living with floor-to-ceiling windows, private terrace, and access to premium amenities including infinity pool and private beach.',
    propertyType: 'Penthouse',
    yearBuilt: 2020,
    features: ['Marina Views', 'Gulf Views', 'Private Terrace', 'Premium Finishes', 'Concierge', 'Infinity Pool Access'],
    coordinates: { lat: 25.0772, lng: 55.1398 },
    agent: {
      id: '6',
      name: 'Omar Al Shamsi',
      email: 'omar.alshamsi@millionflats.com',
      phone: '+971 4 555 0106',
      bio: 'Dubai Marina luxury property expert with 12+ years of experience.',
      propertiesSold: 112,
    },
  },
  {
    id: '7',
    title: 'Modern Apartment in Sharjah',
    location: 'Sharjah',
    price: 3200000, // AED 3.2M
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1800,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80',
    ],
    featured: false,
    description: 'Beautifully designed modern apartment in the heart of Sharjah. This contemporary unit features premium finishes, spacious layouts, and access to community amenities. Perfect for families seeking luxury living in a cultural hub.',
    propertyType: 'Apartment',
    yearBuilt: 2021,
    features: ['Modern Design', 'Premium Finishes', 'Community Amenities', 'Family-Friendly', 'Prime Location', 'Parking'],
    coordinates: { lat: 25.3573, lng: 55.4033 },
    agent: {
      id: '7',
      name: 'Sara Al Qasimi',
      email: 'sara.alqasimi@millionflats.com',
      phone: '+971 6 555 0107',
      bio: 'Sharjah real estate specialist focusing on premium residential properties.',
      propertiesSold: 45,
    },
  },
  {
    id: '8',
    title: 'Luxury Villa in Ajman',
    location: 'Ajman',
    price: 4800000, // AED 4.8M
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 3200,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&q=80',
    ],
    featured: false,
    description: 'Spacious luxury villa in Ajman with private garden and modern amenities. This family-friendly property offers tranquility while maintaining easy access to Dubai and Sharjah. Features include a private pool, landscaped garden, and premium finishes throughout.',
    propertyType: 'Villa',
    yearBuilt: 2020,
    features: ['Private Pool', 'Landscaped Garden', 'Family-Friendly', 'Modern Amenities', 'Quiet Location', 'Easy Access'],
    coordinates: { lat: 25.4052, lng: 55.5136 },
    agent: {
      id: '8',
      name: 'Hassan Al Nuaimi',
      email: 'hassan.alnuaimi@millionflats.com',
      phone: '+971 6 555 0108',
      bio: 'Ajman real estate expert specializing in luxury villas and family properties.',
      propertiesSold: 62,
    },
  },
]

export const mockUsers: any[] = []
export const mockAgents: any[] = []
export const mockOTPs: Map<string, { otp: string; expires: number }> = new Map()
