/**
 * scripts/seed-team.ts
 *
 * Idempotent seeder for initial team member profiles.
 * Safe to run multiple times — deduplicates by displayName slug.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/seed-team.ts
 *
 * OR from package.json:
 *   npm run seed:team
 *
 * What this does:
 *   - Creates TeamMember profiles in DRAFT status for all known team members
 *   - Does NOT create user accounts or grant TeamAccess (those require real accounts)
 *   - Does NOT fabricate Divyesh's details — creates a clearly-flagged incomplete DRAFT
 *   - Safe to re-run: skips members that already exist by displayName
 *
 * Post-seed steps (manual, see deployment instructions):
 *   1. Link each TeamMember to their real userId (if they have a MillionFlats account)
 *   2. Activate profiles once content is reviewed (status → ACTIVE)
 *   3. Grant TeamAccess for each person who should be able to VIEW /team
 *   4. Grant TeamAccess with isTeamAdmin=true for administrators
 *   5. Complete Divyesh's profile via the admin panel before activating
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SeedMember {
  displayName: string
  designation: string | null
  bio: string | null
  imageUrl: string | null
  linkedinUrl: string | null
  location: string | null
  displayOrder: number
  status: 'DRAFT' | 'ACTIVE'
}

// ── Verified team member data (sourced from lib/leadership.ts) ────────────────
// Images use the existing /team/ static paths already in the public folder.

const TEAM_MEMBERS: SeedMember[] = [
  {
    displayName: 'Tarique Mansuri',
    designation: 'Chief Executive Officer',
    bio: 'As the Chief Executive Officer, Tarique drives the global vision and strategic direction of MillionFlats. With a deep understanding of the cross-border real estate landscape, he is dedicated to transforming how Indian UHNIs invest in premium offshore and domestic assets by replacing market friction with data-backed transparency and institutional trust.',
    imageUrl: '/team/tarique.jpeg',
    linkedinUrl: 'https://www.linkedin.com/in/tariquemansuri24/',
    location: 'Global',
    displayOrder: 1,
    status: 'DRAFT',
  },
  {
    displayName: 'Neelam Mamnani',
    designation: 'Managing Director',
    bio: "Serving as Managing Director, Neelam is the operational force behind MillionFlats' aggressive scaling and corporate governance. She ensures seamless execution across all global hubs, aligning the company's financial frameworks, strategic partnerships, and day-to-day operations to deliver a flawless, white-glove experience for every investor.",
    imageUrl: '/team/neelam.jpeg',
    linkedinUrl: 'https://www.linkedin.com/in/neelam1124/',
    location: 'Global',
    displayOrder: 2,
    status: 'DRAFT',
  },
  {
    displayName: 'Carel De Wet',
    designation: 'Company Advisor (Dubai)',
    bio: 'Based in our Dubai hub, Carel brings decades of localized real estate authority and Tier-1 developer relationships to the MillionFlats advisory board. His strategic insights into the UAE market and regulatory landscape provide our investors with exclusive access to high-yield, premium inventory that is typically reserved for institutional funds.',
    imageUrl: '/team/carel.jpeg',
    linkedinUrl: 'https://www.linkedin.com',
    location: 'Dubai',
    displayOrder: 3,
    status: 'DRAFT',
  },
  {
    displayName: 'Paresh Dubariya',
    designation: 'Head of Domestic Sales',
    bio: "Paresh spearheads our premium domestic real estate division, catering to UHNIs seeking high-value assets across India. Beyond property acquisition, he seamlessly integrates our 12-tier ancillary ecosystem—from luxury interior design to bespoke home finance—providing a holistic, end-to-end lifecycle service for our elite clientele.",
    imageUrl: '/team/Paresh.jpeg',
    linkedinUrl: 'https://www.linkedin.com/in/paresh-dubariya-913a612b/',
    location: 'India',
    displayOrder: 4,
    status: 'DRAFT',
  },
  {
    displayName: 'Karan Kathur',
    designation: 'Head of Technology & AI',
    bio: "Karan is the mastermind behind MillionFlats' proprietary PropTech infrastructure. He leads the development of our core technological moats, including the AI-driven Verix™ Risk Scoring and the immersive Meta-dology™ 3D Digital Twins, empowering buyers and developers with enterprise-grade data and spatial computing tools.",
    imageUrl: '/team/karan.jpeg',
    linkedinUrl: 'https://www.linkedin.com/in/karan-kathur/',
    location: 'Global',
    displayOrder: 5,
    status: 'DRAFT',
  },
  {
    displayName: 'Dharani Shanmugam',
    designation: 'Head of Blockchain & Tokenization (London)',
    bio: "Stationed in London, Dharani leads our forward-looking Web3 and FinTech initiatives. She is pioneering the future of borderless real estate through secure smart contracts and asset tokenization, laying the groundwork for fractional luxury ownership and legally compliant, blockchain-backed property transactions.",
    imageUrl: '/team/dharani.jpg',
    linkedinUrl: 'https://www.linkedin.com/in/dharanii/',
    location: 'London',
    displayOrder: 6,
    status: 'DRAFT',
  },
  {
    displayName: 'Bharat Tank',
    designation: 'Head of Administration',
    bio: 'Bharat ensures the structural integrity and legal compliance of the MillionFlats enterprise. He oversees human resources, financial operations, and crucially, the strict FEMA and LRS regulatory frameworks required for seamless, secure cross-border capital routing, ensuring absolute financial peace of mind for our investors.',
    imageUrl: '/team/bharat.jpeg',
    linkedinUrl: 'https://www.linkedin.com',
    location: 'India',
    displayOrder: 7,
    status: 'DRAFT',
  },
  {
    displayName: 'Nitin Mohite',
    designation: 'Channel Partnership Manager',
    bio: 'Leveraging 7 years of real estate expertise to aggressively hunt, onboard, and scale our elite B2B ecosystem of CAs, wealth managers, and boutique brokers.',
    imageUrl: '/team/nitin.jpeg',
    linkedinUrl: 'https://www.linkedin.com',
    location: 'India',
    displayOrder: 8,
    status: 'DRAFT',
  },

  // ── Divyesh: incomplete profile (DRAFT) ──────────────────────────────────
  // Only first name is verified. Surname, designation, bio, and photo must
  // be completed by an authorized administrator before this profile is activated.
  {
    displayName: 'Divyesh',
    designation: null,      // ← REQUIRED: to be filled by admin
    bio: null,              // ← REQUIRED: to be filled by admin
    imageUrl: null,         // ← REQUIRED: to be filled by admin
    linkedinUrl: null,
    location: null,
    displayOrder: 9,
    status: 'DRAFT',        // Will NOT appear in /team until activated by admin
  },
]

// ── Seed function ─────────────────────────────────────────────────────────────

async function seedTeam() {
  console.log('🌱 Seeding team member profiles...\n')

  let created = 0
  let skipped = 0

  for (const member of TEAM_MEMBERS) {
    const existing = await prisma.teamMember.findFirst({
      where: { displayName: member.displayName },
    })

    if (existing) {
      console.log(`⏭  Skipping "${member.displayName}" — profile already exists (id: ${existing.id})`)
      skipped++
      continue
    }

    const created_member = await prisma.teamMember.create({
      data: {
        displayName: member.displayName,
        designation: member.designation,
        bio: member.bio,
        imageUrl: member.imageUrl,
        linkedinUrl: member.linkedinUrl,
        location: member.location,
        displayOrder: member.displayOrder,
        status: member.status,
        userId: null, // Links to real users must be done manually via admin panel
      },
    })

    const statusIcon = member.status === 'ACTIVE' ? '✅' : '📋'
    console.log(`${statusIcon} Created "${member.displayName}" [${member.status}] — id: ${created_member.id}`)
    created++
  }

  console.log(`\n✅ Seed complete: ${created} created, ${skipped} skipped`)
  console.log('\n📋 Next steps:')
  console.log('  1. Go to /admin/team → Access tab → Grant Access for each team member\'s MillionFlats account')
  console.log('  2. Go to /admin/team → Profiles tab → Link each profile to a user account')
  console.log('  3. Complete Divyesh\'s profile (designation, bio, photo) before activating')
  console.log('  4. Activate profiles once reviewed (status → ACTIVE)')
  console.log('  5. Grant at least one team member isTeamAdmin=true to enable admin management\n')
}

seedTeam()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
