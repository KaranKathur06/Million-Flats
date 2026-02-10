import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const LOCATIONS: Record<string, Record<string, string[]>> = {
  UAE: {
    Dubai: ['Downtown Dubai', 'Dubai Marina', 'Business Bay', 'Palm Jumeirah', 'Jumeirah Village Circle'],
    'Abu Dhabi': ['Yas Island', 'Saadiyat Island', 'Al Reem Island'],
    Sharjah: ['Al Majaz', 'Al Nahda', 'Al Khan'],
    Ajman: ['Al Nuaimiya', 'Al Rashidiya'],
    'Ras Al Khaimah': ['Al Hamra Village', 'Mina Al Arab'],
    Fujairah: ['Al Faseel', 'Dibba'],
    'Umm Al Quwain': ['Al Salamah', 'Al Raas'],
  },
  India: {
    Bangalore: ['Whitefield', 'Sarjapur Road', 'Electronic City'],
    Pune: ['Hinjewadi', 'Kharadi', 'Baner'],
    Hyderabad: ['Gachibowli', 'HITEC City', 'Kondapur'],
    Chennai: ['OMR', 'Anna Nagar', 'Adyar'],
    Mumbai: ['Bandra', 'Andheri', 'Powai', 'Lower Parel'],
    Ahmedabad: ['Satellite', 'SG Highway', 'Bopal'],
    Gurgaon: ['Golf Course Road', 'Sector 57', 'Sohna Road'],
    Noida: ['Sector 62', 'Sector 150', 'Noida Extension'],
    Kochi: ['Kakkanad', 'Edappally', 'Panampilly Nagar'],
    Trivandrum: ['Kowdiar', 'Technopark', 'Pattom'],
    Coimbatore: ['RS Puram', 'Peelamedu', 'Saravanampatti'],
    Rajkot: ['Kalawad Road', '150 Feet Ring Road', 'University Road'],
    Surat: ['Vesu', 'Adajan', 'Piplod'],
    Vadodara: ['Alkapuri', 'Gotri', 'Manjalpur'],
    Indore: ['Vijay Nagar', 'Palasia', 'Rau'],
    Jaipur: ['Malviya Nagar', 'Vaishali Nagar', 'Mansarovar'],
    Lucknow: ['Gomti Nagar', 'Hazratganj', 'Aliganj'],
    Chandigarh: ['Sector 17', 'Sector 35', 'Sector 43'],
    Kolkata: ['Salt Lake', 'New Town', 'Ballygunge'],
    Nagpur: ['Dharampeth', 'Manish Nagar', 'Wardha Road'],
  },
}

function requiredEnv(name: string): string {
  const v = process.env[name]
  if (!v || !v.trim()) {
    throw new Error(`[seed] Missing required environment variable: ${name}`)
  }
  return v.trim()
}

function boolEnv(name: string, defaultValue = false): boolean {
  const raw = process.env[name]
  if (!raw) return defaultValue
  return ['1', 'true', 'yes', 'y', 'on'].includes(raw.trim().toLowerCase())
}

async function seedLocations() {
  for (const [country, cities] of Object.entries(LOCATIONS)) {
    for (const [cityName, communities] of Object.entries(cities)) {
      const city = await prisma.city.upsert({
        where: {
          countryCode_name: {
            countryCode: country as any,
            name: cityName,
          },
        },
        update: {},
        create: {
          countryCode: country as any,
          name: cityName,
        },
      })

      for (const communityName of communities) {
        await prisma.community.upsert({
          where: {
            cityId_name: {
              cityId: city.id,
              name: communityName,
            },
          },
          update: {},
          create: {
            cityId: city.id,
            name: communityName,
          },
        })
      }
    }
  }
}

async function seedSuperAdmin() {
  const email = (process.env.SUPERADMIN_EMAIL || 'admin@millionflats.com').trim().toLowerCase()
  const password = requiredEnv('SUPERADMIN_PASSWORD')
  const passwordHash = await bcrypt.hash(password, 12)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      password: passwordHash,
      emailVerified: true as any,
      emailVerifiedAt: new Date() as any,
      verified: true as any,
    } as any,
    create: {
      email,
      role: Role.ADMIN,
      password: passwordHash,
      emailVerified: true as any,
      emailVerifiedAt: new Date() as any,
      verified: true as any,
    } as any,
    select: { id: true, email: true, role: true },
  })

  console.log(`[seed] Super Admin ensured: ${admin.email} (${admin.role})`) 

  return admin
}

async function seedTestAgent() {
  const enabled = boolEnv('SEED_TEST_AGENT', false)
  if (!enabled) return

  const email = (process.env.TEST_AGENT_EMAIL || 'agent@millionflats.com').trim().toLowerCase()
  const password = requiredEnv('TEST_AGENT_PASSWORD')
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.AGENT,
      password: passwordHash,
      emailVerified: true as any,
      emailVerifiedAt: new Date() as any,
      verified: true as any,
    } as any,
    create: {
      email,
      role: Role.AGENT,
      password: passwordHash,
      emailVerified: true as any,
      emailVerifiedAt: new Date() as any,
      verified: true as any,
    } as any,
    select: { id: true, email: true, role: true },
  })

  await prisma.agent.upsert({
    where: { userId: user.id },
    update: {
      approved: true,
    } as any,
    create: {
      userId: user.id,
      approved: true,
    } as any,
    select: { id: true, userId: true, approved: true },
  })

  console.log(`[seed] Test Agent ensured: ${user.email} (${user.role})`) 
}

async function main() {
  await seedLocations()
  await seedSuperAdmin()
  await seedTestAgent()
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
