import Link from 'next/link'
import ResolvedImage from '@/components/media/ResolvedImage'
import { MEDIA_FALLBACKS } from '@/lib/media/resolveMedia'
import type { DeveloperProfileData } from './types'

type DeveloperHeroProps = {
  developer: DeveloperProfileData
}

export default function DeveloperHero({ developer }: DeveloperHeroProps) {
  const showBanner = Boolean(developer.hasCustomBanner && developer.banner)

  return (
    <section className="relative min-h-[420px] overflow-hidden bg-gradient-to-br from-[#0a1628] via-[#0d1f38] to-[#132a4a] sm:min-h-[480px]">
      {showBanner ? (
        <>
          <ResolvedImage
            src={developer.banner}
            alt={`${developer.name} banner`}
            fallback={MEDIA_FALLBACKS.developerBanner}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-dark-blue/95 via-dark-blue/75 to-dark-blue/35" />
        </>
      ) : (
        <>
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-primary-600/15 blur-[100px]" />
        </>
      )}

      <div className="relative mx-auto flex min-h-[420px] w-full max-w-[1200px] items-end px-4 pb-12 pt-24 sm:min-h-[480px] sm:px-6 lg:px-8 lg:pb-16">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/20 bg-white p-1.5 shadow-lg sm:h-[4.5rem] sm:w-[4.5rem]">
              <ResolvedImage
                src={developer.logo}
                alt={`${developer.name} logo`}
                fallback={MEDIA_FALLBACKS.developerLogo}
                className="h-full w-full rounded-lg"
                objectFit="contain"
                loading="eager"
              />
            </div>
            {developer.verified && (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-600/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <svg className="h-3.5 w-3.5 text-emerald-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified Developer
              </span>
            )}
            {developer.AIScore && developer.AIScore > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-200 backdrop-blur">
                AI Score: {developer.AIScore}/100
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">{developer.name}</h1>
          <p className="mt-3 text-base text-white/85 sm:text-lg">{developer.tagline}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/65">
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {developer.city}, {developer.country}
            </span>
            {developer.founded_year ? (
              <span>Est. {developer.founded_year}</span>
            ) : null}
            {developer.stats.projects > 0 ? (
              <span>{developer.stats.projects} Published Projects</span>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#developer-projects"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-amber-500 px-5 text-sm font-bold text-black shadow-lg shadow-amber-500/25 transition-colors hover:bg-amber-400"
            >
              View Projects
            </a>
            <a
              href="#developer-contact"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              Send Inquiry
            </a>
            {developer.website ? (
              <Link
                href={developer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white/90 hover:bg-white/10"
              >
                Official Site
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
