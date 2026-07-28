export interface LeadershipMember {
  id: string
  name: string
  title: string
  bio: string
  image: string
  location?: string
  linkedinUrl?: string
}

export interface LeadershipSection {
  title: string
  members: LeadershipMember[]
}

export const leadershipSections: LeadershipSection[] = [
  {
    title: 'Executive Leadership',
    members: [
      {
        id: 'tarique-mansuri',
        name: 'Tarique Mansuri',
        title: 'Chief Executive Officer',
        bio: 'As the Chief Executive Officer, Tarique drives the global vision and strategic direction of MillionFlats. With a deep understanding of the cross-border real estate landscape, he is dedicated to transforming how Indian UHNIs invest in premium offshore and domestic assets by replacing market friction with data-backed transparency and institutional trust.',
        image: '/team/tarique.jpeg',
        location: 'Global',
        linkedinUrl: 'https://www.linkedin.com',
      },
      {
        id: 'neelam-mamnani',
        name: 'Neelam Mamnani',
        title: 'Managing Director',
        bio: 'Serving as Managing Director, Neelam is the operational force behind MillionFlats\' aggressive scaling and corporate governance. She ensures seamless execution across all global hubs, aligning the company\'s financial frameworks, strategic partnerships, and day-to-day operations to deliver a flawless, white-glove experience for every investor.',
        image: '/team/neelam.jpeg',
        location: 'Global',
        linkedinUrl: 'https://www.linkedin.com',
      },
    ],
  },
  {
    title: 'Advisory & Strategy',
    members: [
      {
        id: 'carel-de-wet',
        name: 'Carel De Wet',
        title: 'Company Advisor (Dubai)',
        bio: 'Based in our Dubai hub, Carel brings decades of localized real estate authority and Tier-1 developer relationships to the MillionFlats advisory board. His strategic insights into the UAE market and regulatory landscape provide our investors with exclusive access to high-yield, premium inventory that is typically reserved for institutional funds.',
        image: '/team/carel.jpeg',
        location: 'Dubai',
        linkedinUrl: 'https://www.linkedin.com',
      },
    ],
  },
  {
    title: 'Sales & Partnerships',
    members: [
      {
        id: 'divesh-more',
        name: 'Divesh More',
        title: 'Head of Sales & Partnerships (Mumbai)',
        bio: 'Operating from Mumbai, Divesh architects MillionFlats\' rapidly expanding B2B ecosystem. He leads the charge in onboarding elite Tier-1 developers, boutique agencies, and wealth managers, ensuring our offshore investors receive unparalleled access to Dubai\'s finest luxury assets while driving highly lucrative channel partnerships.',
        image: '/team/divesh.jpeg',
        location: 'Mumbai',
        linkedinUrl: 'https://www.linkedin.com',
      },
      {
        id: 'paresh-dubariya',
        name: 'Paresh Dubariya',
        title: 'Head of Domestic Sales',
        bio: 'Paresh spearheads our premium domestic real estate division, catering to UHNIs seeking high-value assets across India. Beyond property acquisition, he seamlessly integrates our 12-tier ancillary ecosystem—from luxury interior design to bespoke home finance—providing a holistic, end-to-end lifecycle service for our elite clientele.',
        image: '/team/Paresh.jpeg',
        location: 'India',
        linkedinUrl: 'https://www.linkedin.com',
      },
    ],
  },
  {
    title: 'Technology & Innovation',
    members: [
      {
        id: 'karan-kathur',
        name: 'Karan Kathur',
        title: 'Head of Technology & AI',
        bio: 'Karan is the mastermind behind MillionFlats\' proprietary PropTech infrastructure. He leads the development of our core technological moats, including the AI-driven Verix™ Risk Scoring and the immersive Meta-dology™ 3D Digital Twins, empowering buyers and developers with enterprise-grade data and spatial computing tools.',
        image: '/team/karan.jpeg',
        location: 'Global',
        linkedinUrl: 'https://www.linkedin.com',
      },
      {
        id: 'dharani-shanmugam',
        name: 'Dharani Shanmugam',
        title: 'Head of Blockchain & Tokenization (London)',
        bio: 'Stationed in London, Dharani leads our forward-looking Web3 and FinTech initiatives. She is pioneering the future of borderless real estate through secure smart contracts and asset tokenization, laying the groundwork for fractional luxury ownership and legally compliant, blockchain-backed property transactions.',
        image: '/team/dharani.jpg',
        location: 'London',
        linkedinUrl: 'https://www.linkedin.com',
      },
    ],
  },
  {
    title: 'Growth & Operations',
    members: [
      {
        id: 'pratik-bachchhe',
        name: 'Pratik Bachchhe',
        title: 'Head of Growth & Marketing',
        bio: 'Pratik architects the prestige and global visibility of the MillionFlats brand. Leading our growth marketing division, he connects high-intent UHNIs with our platform through targeted digital acquisition and VIP experiential events, while also driving the monetization of our exclusive B2B SaaS and developer advertising tiers.',
        image: '/team/pratik.jpeg',
        location: 'Global',
        linkedinUrl: 'https://www.linkedin.com',
      },
      {
        id: 'bharat-tank',
        name: 'Bharat Tank',
        title: 'Head of Administration',
        bio: 'Bharat ensures the structural integrity and legal compliance of the MillionFlats enterprise. He oversees human resources, financial operations, and crucially, the strict FEMA and LRS regulatory frameworks required for seamless, secure cross-border capital routing, ensuring absolute financial peace of mind for our investors.',
        image: '/team/bharat.jpeg',
        location: 'India',
        linkedinUrl: 'https://www.linkedin.com',
      },
    ],
  },
]
