import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type AgencyPageProps = {
  params: { slug: string }
}

function getMetadataBase() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || '').trim()
  return base ? base.replace(/\/$/, '') : ''
}

export async function generateMetadata({ params }: AgencyPageProps): Promise<Metadata> {
  const agency = await (prisma as any).agencyProfile.findUnique({
    where: { slug: params.slug },
  })

  if (!agency) {
    return { title: 'Agency Not Found | MillionFlats' }
  }

  const base = getMetadataBase()
  const canonical = base ? `${base}/agencies/${params.slug}` : ''

  return {
    title: `${agency.agencyName} - Real Estate Agency | MillionFlats`,
    description: agency.shortDescription || `Explore ${agency.agencyName} projects and services on MillionFlats.`,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title: `${agency.agencyName} - Real Estate Agency | MillionFlats`,
      description: agency.shortDescription || `Premium services by ${agency.agencyName}`,
      url: canonical || undefined,
      type: 'website',
      images: agency.banner ? [{ url: agency.banner }] : undefined,
    },
  }
}

export default async function AgencyProfilePage({ params }: AgencyPageProps) {
  const agency = await (prisma as any).agencyProfile.findUnique({
    where: { slug: params.slug },
    include: {
      user: { select: { email: true, phone: true, createdAt: true } },
      linkedAgency: { select: { id: true, name: true, countryIso2: true } },
    },
  })

  if (!agency) {
    notFound()
  }

  const base = getMetadataBase()
  const canonical = base ? `${base}/agencies/${params.slug}` : ''

  return (
    <div className="min-h-screen bg-white">
      {/* Banner */}
      {agency.banner && (
        <div className="relative h-64 md:h-80 overflow-hidden bg-gradient-to-br from-gray-200 to-gray-300">
          <img
            src={agency.banner}
            alt={agency.agencyName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-center mb-8 md:mb-12">
          {agency.logo && (
            <div className="h-24 w-24 md:h-32 md:w-32 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={agency.logo}
                alt={agency.agencyName}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              {agency.agencyName}
            </h1>
            {agency.shortDescription && (
              <p className="text-lg text-gray-600 mb-4">{agency.shortDescription}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-4">
              {agency.isVerified && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                  ✓ Verified
                </span>
              )}
              {agency.isFeatured && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-sm font-medium">
                  ★ Featured Agency
                </span>
              )}
              {agency.onboardingStatus === 'APPROVED' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
                  ✓ Approved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-12">
          {agency.city && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">City</div>
              <div className="text-lg font-semibold text-gray-900">{agency.city}</div>
            </div>
          )}

          {agency.country && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Country</div>
              <div className="text-lg font-semibold text-gray-900">{agency.country}</div>
            </div>
          )}

          {agency.yearEstablished && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Established</div>
              <div className="text-lg font-semibold text-gray-900">{agency.yearEstablished}</div>
            </div>
          )}

          {agency.totalAgents && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Agents</div>
              <div className="text-lg font-semibold text-gray-900">{agency.totalAgents}</div>
            </div>
          )}

          {agency.agencySize && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Agency Size</div>
              <div className="text-lg font-semibold text-gray-900">{agency.agencySize}</div>
            </div>
          )}

          {agency.phone && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Phone</div>
              <div className="text-lg font-semibold text-gray-900">{agency.phone}</div>
            </div>
          )}
        </div>

        {/* Description */}
        {agency.description && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">About</h2>
            <div className="prose prose-sm max-w-none text-gray-700">
              {agency.description}
            </div>
          </div>
        )}

        {/* Specializations */}
        {agency.specializations && agency.specializations.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Specializations</h2>
            <div className="flex flex-wrap gap-2">
              {agency.specializations.map((spec: string) => (
                <span
                  key={spec}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-medium"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Operating Areas */}
        {agency.operatingAreas && agency.operatingAreas.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Operating Areas</h2>
            <div className="flex flex-wrap gap-2">
              {agency.operatingAreas.map((area: string) => (
                <span
                  key={area}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Contact Section */}
        <div className="mb-12 rounded-2xl border border-gray-200 bg-gray-50 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agency.email && (
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Email</div>
                <a href={`mailto:${agency.email}`} className="text-blue-600 hover:underline">
                  {agency.email}
                </a>
              </div>
            )}
            {agency.phone && (
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Phone</div>
                <a href={`tel:${agency.phone}`} className="text-blue-600 hover:underline">
                  {agency.phone}
                </a>
              </div>
            )}
            {agency.whatsapp && (
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">WhatsApp</div>
                <a href={`https://wa.me/${agency.whatsapp}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {agency.whatsapp}
                </a>
              </div>
            )}
            {agency.website && (
              <div>
                <div className="text-sm font-semibold text-gray-600 mb-2">Website</div>
                <a href={agency.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {agency.website}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Social Links */}
        {(agency.linkedinUrl || agency.instagramUrl || agency.facebookUrl) && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Follow Us</h2>
            <div className="flex gap-4">
              {agency.linkedinUrl && (
                <a href={agency.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition">
                  <span className="sr-only">LinkedIn</span>
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              )}
              {agency.instagramUrl && (
                <a href={agency.instagramUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-pink-600 transition">
                  <span className="sr-only">Instagram</span>
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0m0 2.192c5.433 0 9.808 4.375 9.808 9.808S17.433 21.808 12 21.808 2.192 17.433 2.192 12 6.567 2.192 12 2.192m0 1.441c-4.597 0-8.367 3.77-8.367 8.367s3.77 8.367 8.367 8.367 8.367-3.77 8.367-8.367-3.77-8.367-8.367-8.367m0 2.389c-3.285 0-5.978 2.693-5.978 5.978s2.693 5.978 5.978 5.978 5.978-2.693 5.978-5.978-2.693-5.978-5.978-5.978m6.406-1.78c0 .663-.538 1.201-1.201 1.201s-1.201-.538-1.201-1.201.538-1.201 1.201-1.201 1.201.538 1.201 1.201" />
                  </svg>
                </a>
              )}
              {agency.facebookUrl && (
                <a href={agency.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-blue-600 transition">
                  <span className="sr-only">Facebook</span>
                  <svg className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="pt-8 border-t border-gray-200">
          <Link href="/agencies" className="text-blue-600 hover:underline text-sm font-medium">
            ← Back to all agencies
          </Link>
        </div>
      </div>

      {/* JSON-LD Schema */}
      {canonical && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'RealEstateAgent',
              name: agency.agencyName,
              url: canonical,
              logo: agency.logo || undefined,
              image: agency.banner || undefined,
              description: agency.description || agency.shortDescription,
              address: {
                '@type': 'PostalAddress',
                streetAddress: agency.address || undefined,
                addressLocality: agency.city || undefined,
                addressCountry: agency.country || undefined,
              },
              telephone: agency.phone || undefined,
              email: agency.email || undefined,
            }),
          }}
        />
      )}
    </div>
  )
}
