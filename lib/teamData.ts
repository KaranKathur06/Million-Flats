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
        name: 'Hardik Vyas',
        role: 'COO',
        bio: 'Marketing and networking leader with 15+ years of global experience, including leadership roles at Falcon Company, Rajkot, as Export Manager.',
        image: '/team/hardik.jpeg',
      },
    ],
  },
  {
    title: 'Strategy & Advisory',
    members: [
      {
        name: 'Rahul Virani',
        role: 'GTM & Strategic Advisor',
        bio: 'Brings deep cross-market expertise, driving early partnerships and revenue pipelines across India and the UAE.',
        image: '/team/rahul.jpeg',
      },
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
        name: 'Kushal Bhatt',
        role: '3D Specialist',
        bio: 'Expert in Unreal Engine development, real-time 3D environments, simulations, and gamified user experiences.',
        image: '/team/kushal.jpeg',
      },
      {
        name: 'Dharami Shanmugam',
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
]
