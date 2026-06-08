import type { DeveloperProfileData } from './types'

type DeveloperAboutProps = {
  developer: DeveloperProfileData
}

export default function DeveloperAbout({ developer }: DeveloperAboutProps) {
  const paragraphs = developer.description
    .split('\n\n')
    .map((entry) => entry.trim())
    .filter(Boolean)

  const { socialLinks } = developer
  const hasSocials = socialLinks.facebook || socialLinks.instagram || socialLinks.linkedin || socialLinks.youtube

  return (
    <section className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 sm:px-6 lg:grid-cols-3 lg:gap-10 lg:px-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold tracking-tight text-dark-blue sm:text-3xl">About {developer.name}</h2>
          <div className="mt-6 space-y-4 text-sm leading-7 text-gray-600 sm:text-base">
            {paragraphs.map((paragraph, index) => (
              <p key={`${developer.name}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Developer Snapshot */}
          <div className="h-fit rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-dark-blue">Developer Snapshot</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <div className="border-b border-gray-100 pb-3">
                <dt className="text-gray-500">Founded Year</dt>
                <dd className="mt-1 font-semibold text-gray-800">{developer.founded_year || 'N/A'}</dd>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <dt className="text-gray-500">HQ Location</dt>
                <dd className="mt-1 font-semibold text-gray-800">
                  {developer.headquarters || `${developer.city}, ${developer.country}`}
                </dd>
              </div>
              <div className="border-b border-gray-100 pb-3">
                <dt className="text-gray-500">Specialization</dt>
                <dd className="mt-1 font-semibold text-gray-800">{developer.specialization}</dd>
              </div>
              {developer.website && (
                <div className="border-b border-gray-100 pb-3">
                  <dt className="text-gray-500">Website</dt>
                  <dd className="mt-1">
                    <a
                      href={developer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary-600 hover:text-primary-700 transition-colors inline-flex items-center gap-1"
                    >
                      Visit Website
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </dd>
                </div>
              )}
              {developer.email && (
                <div className="border-b border-gray-100 pb-3">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="mt-1 font-semibold text-gray-800">{developer.email}</dd>
                </div>
              )}
              {developer.phone && (
                <div>
                  <dt className="text-gray-500">Phone</dt>
                  <dd className="mt-1 font-semibold text-gray-800">{developer.phone}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Social Links */}
          {hasSocials && (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Follow Developer</h3>
              <div className="flex items-center gap-3">
                {socialLinks.facebook && (
                  <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" aria-label="Facebook">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                )}
                {socialLinks.instagram && (
                  <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600 hover:bg-pink-100 transition-colors" aria-label="Instagram">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
                  </a>
                )}
                {socialLinks.linkedin && (
                  <a href={socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors" aria-label="LinkedIn">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </a>
                )}
                {socialLinks.youtube && (
                  <a href={socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors" aria-label="YouTube">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  )
}
