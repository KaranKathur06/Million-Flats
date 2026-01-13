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
