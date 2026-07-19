export type TeamMember = {
  name: string
  role: string
  bio: string
  image: string
}

export type TeamSection = {
  title: string
  members: TeamMember[]
}

export const teamSections: TeamSection[] = [
  {
    title: 'Leadership',
    members: [
      {
        name: 'Tarique Mansuri',
        role: 'CEO',
        bio: 'With over 20 years of experience in Business Development and 10+ years in blockchain, AI, and global markets, Tarique drives MillionFlats’ strategic vision and growth.',
        image: '/team/tarique.jpeg',
      },
      {
        name: 'Ms. Neelam',
        role: 'Managing Director',
        bio: "She provides strategic oversight and governance. She represents the interests of our investors and guides the company's long-term vision and financial stewardship.",
        image: '/team/neelam.jpeg',
      },
    ],
  },
  {
    title: 'Strategy & Advisory',
    members: [
      {
        name: 'Carel de Wet',
        role: 'Advisor – UAE',
        bio: 'Provides strong regional market expertise to accelerate launch strategy and secure anchor clients in the UAE.',
        image: '/team/carel.jpeg',
      },
    ],
  },
  {
    title: 'Technology & Innovation',
    members: [

      {
        name: 'Dharani Shanmugam',
        role: 'Full Stack Developer',
        bio: 'Specialist in React.js, TypeScript, Node.js, and blockchain platforms, building scalable, data-driven applications.',
        image: '/team/dharani.jpg',
      },
      {
        name: 'Karan Kathur',
        role: 'AI Lead',
        bio: 'Strong foundation in Python, PostgreSQL, and task orchestration, contributing to real-time analytics and intelligent dashboards.',
        image: '/team/karan%20.jpeg',
      },
    ],
  },

  {
    title: 'Marketing Team',
    members: [
      {
        name: "Divesh More",
        role: "Business Development Manager",
        bio: "Driving strategic growth through enterprise partnerships, market expansion, and high-value business relationships across the MillionFlats ecosystem.",
        image: '/team/dives.jpeg'
      },


      {
        name: 'Bharat Tank',
        role: 'Sales Development Representative',
        bio: 'Supporting business growth by engaging prospective clients, nurturing qualified leads, and building lasting customer relationships across the real estate marketplace.',
        image: '/team/bharat.jpeg',
      },


      {
        name: 'Pratik Bachchhe',
        role: 'Sales Development Representative',
        bio: 'Dedicated to growing the MillionFlats verified ecosystem by onboarding India’s top RERA-registered agents and developers.',
        image: '/team/pratik.jpeg',
      },
    ],
  },
]
