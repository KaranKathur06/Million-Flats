import Link from 'next/link'

export const metadata = {
  title: 'Cement & Structural - Coming Soon | MillionFlats',
}

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-14 pb-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-serif font-bold text-dark-blue">Cement & Structural</h1>
            <p className="mt-4 text-lg text-gray-600">This ecosystem segment is not live yet. We are working on onboarding premium partners and will launch it soon.</p>
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-14">
          <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-8 sm:p-10">
            <div className="text-sm font-semibold text-dark-blue">In Progress</div>
            <div className="mt-2 text-2xl sm:text-3xl font-serif font-bold text-gray-900">A professional experience is on the way.</div>
            <div className="mt-3 text-gray-600">If you want to join this partner network early, reach out to our team or wait for the official launch.</div>
            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl bg-dark-blue text-white font-semibold hover:bg-opacity-95"
              >
                Contact Us
              </Link>
              <Link
                href="/ecosystem-partners"
                className="inline-flex items-center justify-center h-12 px-7 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                Back to Ecosystem
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
