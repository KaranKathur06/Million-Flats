const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const LOCATIONS = {
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
    Mumbai: ['Bandra', 'Andheri', 'Powai', 'Lower Parel'],
    'Delhi NCR': ['Gurgaon', 'Noida', 'Dwarka'],
    Bangalore: ['Whitefield', 'Sarjapur Road', 'Electronic City'],
    Hyderabad: ['Gachibowli', 'HITEC City', 'Kondapur'],
    Chennai: ['OMR', 'Anna Nagar', 'Adyar'],
    Pune: ['Hinjewadi', 'Kharadi', 'Baner'],
    Kolkata: ['Salt Lake', 'New Town', 'Ballygunge'],
    Ahmedabad: ['Satellite', 'SG Highway', 'Bopal'],
    Gurgaon: ['Golf Course Road', 'Sector 57', 'Sohna Road'],
    Noida: ['Sector 62', 'Sector 150', 'Noida Extension'],
  },
}

async function main() {
  for (const [country, cities] of Object.entries(LOCATIONS)) {
    for (const [cityName, communities] of Object.entries(cities)) {
      const city = await prisma.city.upsert({
        where: {
          countryCode_name: {
            countryCode: country,
            name: cityName,
          },
        },
        update: {},
        create: {
          countryCode: country,
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

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
