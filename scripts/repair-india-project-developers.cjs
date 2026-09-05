const { PrismaClient } = require('@prisma/client')

const INDIA_CITIES = new Set([
  'bangalore', 'bengaluru', 'pune', 'hyderabad', 'chennai', 'mumbai', 'ahmedabad',
  'gurgaon', 'gurugram', 'noida', 'kochi', 'trivandrum', 'thiruvananthapuram',
  'coimbatore', 'rajkot', 'surat', 'vadodara', 'indore', 'jaipur', 'lucknow',
  'chandigarh', 'kolkata', 'nagpur',
])

const apply = process.argv.includes('--apply')
const prisma = new PrismaClient()

function isIndiaProject(project) {
  const city = String(project.city || '').trim().toLowerCase()
  return project.countryIso2 === 'IN' || INDIA_CITIES.has(city)
}

async function main() {
  const developers = await prisma.developer.findMany({
    where: { countryCode: 'UAE', projects: { some: {} } },
    select: {
      id: true,
      name: true,
      countryCode: true,
      countryIso2: true,
      projects: { select: { id: true, city: true, countryIso2: true } },
    },
  })

  const candidates = developers.filter((developer) => {
    const projects = developer.projects
    return projects.length > 0 && projects.some(isIndiaProject) && projects.every(isIndiaProject)
  })

  console.log(`${apply ? 'Applying' : 'Dry run'}: ${candidates.length} India-only developers currently marked UAE.`)
  for (const developer of candidates) {
    console.log(`- ${developer.name} (${developer.projects.length} projects)`)
  }

  if (!apply) {
    console.log('No changes made. Re-run with --apply to repair these records.')
    return
  }

  for (const developer of candidates) {
    await prisma.developer.update({
      where: { id: developer.id },
      data: { countryCode: 'INDIA', countryIso2: 'IN' },
    })
    await prisma.project.updateMany({
      where: { developerId: developer.id, countryIso2: null },
      data: { countryIso2: 'IN' },
    })
  }

  console.log(`Repaired ${candidates.length} developers and their India project country codes.`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
