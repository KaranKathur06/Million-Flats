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

      <section className="section-spacing bg-[#061d3d] text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <div className="mx-auto mb-4 h-px max-w-[420px] bg-[#d7b369]" />
              <h2 className="font-serif text-4xl font-bold tracking-tight text-[#f2d799] md:text-6xl">
                Our Credentials
              </h2>
              <div className="mt-5 flex items-center justify-center gap-4 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#f2d799]">
                <span>Compliant</span>
                <span className="text-[#f2d799]/70">•</span>
                <span>Recognized</span>
                <span className="text-[#f2d799]/70">•</span>
                <span>Trusted</span>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[22px] border border-[#d7b369]/80 bg-[#0c2345] p-6 shadow-[0_0_0_1px_rgba(215,179,105,0.15)]">
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#d7b369] bg-[#071a31] text-xl font-bold text-[#f2d799]">
                    <span className="flex flex-col items-center leading-none">
                      <span className="text-[11px] tracking-[0.28em]">🇮🇳</span>
                      <span className="mt-2 text-[10px]">CIN</span>
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-3xl font-bold text-[#f2d799] md:text-[2.15rem]">
                      Corporate Identity (CIN)
                    </h3>
                    <div className="mt-5 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7b369]">
                          Identifier / Status
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white md:text-3xl">U62099GJ2026PTC173224</p>
                      </div>
                      <div className="h-px w-full bg-[#d7b369]/50" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7b369]">
                          Authority
                        </p>
                        <p className="mt-2 text-xl text-white md:text-2xl">Ministry of Corporate Affairs<br className="hidden md:block" />(RoC Ahmedabad)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-[#d7b369]/80 bg-[#0c2345] p-6 shadow-[0_0_0_1px_rgba(215,179,105,0.15)]">
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#d7b369] bg-[#071a31] text-sm font-bold text-[#f2d799]">
                    <span className="flex flex-col items-center leading-tight">
                      <span className="text-xl">#</span>
                      <span className="text-[10px] tracking-[0.12em]">startup</span>
                      <span className="text-[10px] tracking-[0.12em]">india</span>
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-3xl font-bold text-[#f2d799] md:text-[2.15rem]">
                      DPIIT Recognition
                    </h3>
                    <div className="mt-5 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7b369]">
                          Identifier / Status
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white md:text-3xl">DIPP249451</p>
                      </div>
                      <div className="h-px w-full bg-[#d7b369]/50" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7b369]">
                          Authority
                        </p>
                        <p className="mt-2 text-xl text-white md:text-2xl">Startup India /<br className="hidden md:block" />Ministry of Commerce &amp; Industry</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-[#d7b369]/80 bg-[#0c2345] p-6 shadow-[0_0_0_1px_rgba(215,179,105,0.15)]">
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#d7b369] bg-[#071a31] text-2xl font-bold text-[#f2d799]">
                    GST
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-3xl font-bold text-[#f2d799] md:text-[2.15rem]">
                      Goods &amp; Services Tax (GST)
                    </h3>
                    <div className="mt-5 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7b369]">
                          Identifier / Status
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white md:text-3xl">24AAUCM4853G1Z3</p>
                      </div>
                      <div className="h-px w-full bg-[#d7b369]/50" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7b369]">
                          Authority
                        </p>
                        <p className="mt-2 text-xl text-white md:text-2xl">Government of India</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-[#d7b369]/80 bg-[#0c2345] p-6 shadow-[0_0_0_1px_rgba(215,179,105,0.15)]">
                <div className="flex items-center gap-5">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#d7b369] bg-[#071a31] text-xl font-bold text-[#f2d799]">
                    <span className="flex flex-col items-center leading-none">
                      <span className="text-[11px] tracking-[0.2em]">🇮🇳</span>
                      <span className="mt-2 text-[10px]">DGFT</span>
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-3xl font-bold text-[#f2d799] md:text-[2.15rem]">
                      Importer-Exporter Code (IEC)
                    </h3>
                    <div className="mt-5 space-y-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7b369]">
                          Identifier / Status
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white md:text-3xl">AAUCM4853G</p>
                      </div>
                      <div className="h-px w-full bg-[#d7b369]/50" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d7b369]">
                          Authority
                        </p>
                        <p className="mt-2 text-xl text-white md:text-2xl">Directorate General of Foreign Trade<br className="hidden md:block" />(DGFT)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-center">
              <div className="h-px w-full max-w-[760px] bg-[#d7b369]" />
            </div>
          </div>
        </div>
      </section>

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

