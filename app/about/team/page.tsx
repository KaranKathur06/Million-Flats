import TeamMemberAvatar from '@/components/TeamMemberAvatar'

export const metadata = {
  title: 'Our Leadership & Core Team - millionflats',
  description: 'Meet the leadership and core team driving innovation across global real estate, technology, and intelligence.',
}

type TeamMember = {
  name: string
  role: string
  bio: string
  image: string
}

type TeamSection = {
  title: string
  members: TeamMember[]
}

const sections: TeamSection[] = [
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

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="section-spacing">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">
              Our Team
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-dark-blue mb-6">
              Our Leadership &amp; Core Team
            </h1>
            <p className="text-lg text-gray-600">
              Driving innovation across global real estate, technology, and intelligence.
            </p>
          </div>
        </div>
      </section>

      <section className="section-spacing bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {sections.map((section) => (
              <div key={section.title}>
                <div className="flex items-center justify-between gap-6 mb-8">
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-dark-blue">
                    {section.title}
                  </h2>
                  <div className="hidden md:block h-px flex-1 bg-gray-200" />
                </div>

                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                  {section.members.map((member) => (
                    <div
                      key={member.name}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 text-center transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
                    >
                      <TeamMemberAvatar src={member.image} alt={member.name} />

                      <h3 className="text-xl font-semibold text-dark-blue">{member.name}</h3>
                      <p className="text-accent-orange font-medium mt-1 mb-3">{member.role}</p>
                      <p className="text-sm text-gray-600 leading-relaxed">{member.bio}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
