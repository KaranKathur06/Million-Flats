import Image from 'next/image'
import MissionVision from '@/components/MissionVision'
import WhatSetsUsApart from '@/components/WhatSetsUsApart'
import CoreValues from '@/components/CoreValues'

export const metadata = {
  title: 'About Us - millionflats | UAE Luxury Real Estate',
  description: 'Learn about millionflats and our mission to transform luxury real estate in the United Arab Emirates.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">
              OUR STORY
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-dark-blue mb-6">
              Redefining Global Real Estate
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We&apos;re building the world&apos;s most trusted platform for premium luxury real estate, connecting discerning buyers and investors with exceptional properties across the globe.
            </p>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">
                OUR STORY
              </p>
              <h2 className="text-4xl font-serif font-bold text-dark-blue mb-6">
                Born from a Vision to Transform Luxury Real Estate
              </h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Founded in 2020, millionflats emerged from a simple idea: luxury real estate deserves a premium platform. We recognized that the world&apos;s most discerning buyers and investors were underserved by traditional portals.
                </p>
                <p>
                  We assembled a team of seasoned real estate professionals, technology experts, and luxury brand strategists. Together, we created an ecosystem where trust, transparency, and exceptional quality define every interaction.
                </p>
                <p>
                  Today, millionflats represents the pinnacle of luxury real estate marketplaces—a global platform where the world&apos;s finest properties find their most worthy stewards.
                </p>
              </div>
            </div>
            <div className="relative h-96 lg:h-[500px] rounded-lg overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80"
                alt="Team collaboration"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">THE TEAM</p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">People Behind the Platform</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A focused team blending real estate expertise, product craftsmanship, and trusted market intelligence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'Aarav Mehta',
                role: 'Growth & Partnerships',
                bio: 'Building premium distribution and partner ecosystems across India & UAE.',
                linkedin: 'https://www.linkedin.com/',
              },
              {
                name: 'Noura Al Mansoori',
                role: 'Market Research',
                bio: 'Translating local insights into data-driven buyer and seller decisions.',
                linkedin: 'https://www.linkedin.com/',
              },
              {
                name: 'Riya Sharma',
                role: 'Product & Experience',
                bio: 'Designing a luxury-first browsing and enquiry experience that converts.',
              },
              {
                name: 'Karan Singh',
                role: 'Engineering',
                bio: 'Building secure systems and scalable integrations for global real estate.',
              },
            ].map((member) => (
              <div key={member.name} className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-dark-blue">{member.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{member.role}</p>
                  </div>
                  {member.linkedin ? (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`${member.name} on LinkedIn`}
                      className="shrink-0 h-10 w-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50"
                    >
                      <svg className="h-5 w-5 text-dark-blue" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H7.351V9h3.414v1.561h.046c.476-.9 1.637-1.85 3.367-1.85 3.6 0 4.267 2.369 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zM6.814 20.452H3.861V9h2.953v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.727v20.545C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.273V1.727C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                    </a>
                  ) : null}
                </div>
                <p className="text-sm text-gray-700 mt-4 leading-relaxed">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <MissionVision />

      {/* What Sets Us Apart */}
      <WhatSetsUsApart />

      {/* Core Values */}
      <CoreValues />
    </div>
  )
}

