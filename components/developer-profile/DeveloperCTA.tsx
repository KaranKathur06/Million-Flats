import type { DeveloperProfileData } from './types'

type DeveloperCTAProps = {
  developer: DeveloperProfileData
}

export default function DeveloperCTA({ developer }: DeveloperCTAProps) {
  return (
    <section id="developer-contact" className="py-12 sm:py-14 lg:py-16">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-primary-700 p-6 text-white shadow-sm sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Interested in {developer.name} Projects?</h2>
              <p className="mt-3 text-sm text-white/85 sm:text-base">
                Connect with our team for inventory details, pricing, payment plans, and latest launch updates.
              </p>
              <a
                href="/contact"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-primary-700 transition-colors hover:bg-gray-100"
              >
                Contact Now
              </a>
            </div>

            <form className="rounded-xl bg-white p-4 text-gray-800 sm:p-5" action="#">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none transition focus:border-primary-500"
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number"
                  className="h-11 rounded-xl border border-gray-200 px-3 text-sm outline-none transition focus:border-primary-500"
                />
              </div>
              <input
                type="email"
                name="email"
                placeholder="Email Address"
                className="mt-3 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm outline-none transition focus:border-primary-500"
              />
              <button
                type="submit"
                className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-dark-blue text-sm font-semibold text-white transition-colors hover:bg-dark-blue/90"
              >
                Get Details
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
