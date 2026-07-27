import TeamMemberAvatar from '@/components/TeamMemberAvatar'
import { leadershipSections } from '@/lib/leadership'

export const metadata = {
  title: 'Our Leadership & Core Team - millionflats',
  description: 'Meet the leadership and core team driving innovation across global real estate, technology, and intelligence.',
}

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
            {leadershipSections.map((section) => (
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
                      key={member.id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 text-center transition-transform duration-200 hover:-translate-y-1 hover:shadow-md"
                    >
                      <TeamMemberAvatar src={member.image} alt={member.name} />

                      <h3 className="text-xl font-semibold text-dark-blue">{member.name}</h3>
                      <p className="text-accent-orange font-medium mt-1 mb-3">{member.title}</p>
                      {member.location ? (
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">{member.location}</p>
                      ) : null}
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
