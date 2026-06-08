import type { DeveloperProfileData } from './types'

type DeveloperHeroProps = {
  developer: DeveloperProfileData
}

export default function DeveloperHero({ developer }: DeveloperHeroProps) {
  return (
    <section className="relative min-h-[460px] overflow-hidden bg-dark-blue">
      <img src={developer.banner} alt={developer.name} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-blue/95 via-dark-blue/75 to-dark-blue/20" />
      <div className="absolute inset-0 backdrop-blur-[1.5px]" />

      <div className="relative mx-auto flex min-h-[460px] w-full max-w-[1200px] items-end px-4 pb-12 pt-28 sm:px-6 lg:px-8 lg:pb-16">
        <div className="max-w-3xl">
          <div className="mb-5 flex items-center gap-3">
            <img
              src={developer.logo}
              alt={`${developer.name} logo`}
              className="h-14 w-14 rounded-xl border border-white/20 bg-white object-cover p-1.5 sm:h-16 sm:w-16"
            />
            {developer.verified ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-300/40 bg-primary-600/25 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-200" />
                Verified Developer
              </span>
            ) : null}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">{developer.name}</h1>
          <p className="mt-3 text-base text-white/85 sm:text-lg">{developer.tagline}</p>
          <p className="mt-3 text-sm text-white/75 sm:text-base">
            {developer.city}, {developer.country}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#developer-projects"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
            >
              View Projects
            </a>
            <a
              href="#developer-contact"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              Contact Developer
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
