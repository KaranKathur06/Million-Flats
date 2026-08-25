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
        linkedinUrl: 'https://www.linkedin.com/in/tariquemansuri24/',
      },
      {
        id: 'neelam-mamnani',
        name: 'Neelam Mamnani',
        title: 'Managing Director',
        bio: 'Serving as Managing Director, Neelam is the operational force behind MillionFlats\' aggressive scaling and corporate governance. She ensures seamless execution across all global hubs, aligning the company\'s financial frameworks, strategic partnerships, and day-to-day operations to deliver a flawless, white-glove experience for every investor.',
        image: '/team/neelam.jpeg',
        location: 'Global',
        linkedinUrl: 'https://www.linkedin.com/in/neelam1124/',
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
        id: 'paresh-dubariya',
        name: 'Paresh Dubariya',
        title: 'Head of Domestic Sales',
        bio: 'Paresh spearheads our premium domestic real estate division, catering to UHNIs seeking high-value assets across India. Beyond property acquisition, he seamlessly integrates our 12-tier ancillary ecosystem—from luxury interior design to bespoke home finance—providing a holistic, end-to-end lifecycle service for our elite clientele.',
        image: '/team/Paresh.jpeg',
        location: 'India',
        linkedinUrl: 'https://www.linkedin.com/in/paresh-dubariya-913a612b/',
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
        linkedinUrl: 'https://www.linkedin.com/in/karan-kathur/',
      },
      {
        id: 'dharani-shanmugam',
        name: 'Dharani Shanmugam',
        title: 'Head of Blockchain & Tokenization (London)',
        bio: 'Stationed in London, Dharani leads our forward-looking Web3 and FinTech initiatives. She is pioneering the future of borderless real estate through secure smart contracts and asset tokenization, laying the groundwork for fractional luxury ownership and legally compliant, blockchain-backed property transactions.',
        image: '/team/dharani.jpg',
        location: 'London',
        linkedinUrl: 'https://www.linkedin.com/in/dharanii/',
      },
    ],
  },
  {
    title: 'Growth & Operations',
    members: [
      {
        id: 'bharat-tank',
        name: 'Bharat Tank',
        title: 'Head of Administration',
        bio: 'Bharat ensures the structural integrity and legal compliance of the MillionFlats enterprise. He oversees human resources, financial operations, and crucially, the strict FEMA and LRS regulatory frameworks required for seamless, secure cross-border capital routing, ensuring absolute financial peace of mind for our investors.',
        image: '/team/bharat.jpeg',
        location: 'India',
        linkedinUrl: 'https://www.linkedin.com',
      },

       {
        id: 'nitin-mohite',
        name: 'Nitin Mohite',
        title: 'Channel Partnership Manager',
        bio: 'Leveraging 7 years of real estate expertise to aggressively hunt, onboard, and scale our elite B2B ecosystem of CAs, wealth managers, and boutique brokers.',
        image: '/team/nitin.jpeg',
        location: 'India',
        linkedinUrl: 'https://www.linkedin.com',
      },
    ],
  },
]
