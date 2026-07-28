import Image from 'next/image'
import MissionVision from '@/components/MissionVision'
import WhatSetsUsApart from '@/components/WhatSetsUsApart'
import CoreValues from '@/components/CoreValues'
import { leadershipSections } from '@/lib/leadership'

export const metadata = {
  title: 'About Us - millionflats | UAE Luxury Real Estate',
  description: 'Learn about millionflats and our mission to transform luxury real estate in the United Arab Emirates.',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-white section-spacing">
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
      <section className="section-spacing bg-gray-50">
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
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <MissionVision />

      <section className="section-spacing bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">OUR TEAM</p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">People Behind the Platform</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Real estate expertise, product craftsmanship, and trusted market intelligence.
            </p>
          </div>

          <div className="space-y-12">
            {leadershipSections.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-6 mb-6">
                  <h3 className="text-xl md:text-2xl font-serif font-bold text-dark-blue">{section.title}</h3>
                  <div className="hidden md:block h-px flex-1 bg-gray-200" />
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {section.members.map((member) => (
                    <div key={member.id} className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                      <div className="flex items-start gap-4">
                        <div className="shrink-0 h-14 w-14 rounded-full bg-white border border-gray-200 overflow-hidden">
                          <Image src={member.image} alt={member.name} width={56} height={56} className="h-14 w-14 object-cover" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-dark-blue">{member.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{member.title}</p>
                        </div>
                      </div>
                      {member.location ? (
                        <p className="text-xs uppercase tracking-[0.2em] text-accent-orange mt-3">{member.location}</p>
                      ) : null}
                      <p className="text-sm text-gray-700 mt-4 leading-relaxed">{member.bio}</p>
                      {member.linkedinUrl ? (
                        <a
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-dark-blue hover:text-accent-orange"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6.94 8.5A1.56 1.56 0 1 0 6.94 5.38a1.56 1.56 0 0 0 0 3.12ZM5.5 9.75h2.88V18H5.5zM10.6 9.75h2.76v1.13h.04c.38-.72 1.32-1.48 2.71-1.48 2.9 0 3.43 1.91 3.43 4.39V18h-2.88v-7.3c0-1.74-.03-3.98-2.42-3.98-2.43 0-2.8 1.9-2.8 3.85V18H10.6z" />
                          </svg>
                          View LinkedIn
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Sets Us Apart */}
      <WhatSetsUsApart />

      {/* Core Values */}
      <CoreValues />
    </div>
  )
}

