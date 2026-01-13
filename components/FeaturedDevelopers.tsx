import Image from 'next/image'
import Link from 'next/link'

export default function FeaturedDevelopers() {
  const developers = [
    { name: 'Aurora Developments', logo: 'https://via.placeholder.com/120x48.png?text=Aurora', href: '/contact' },
    { name: 'Palmstone Group', logo: 'https://via.placeholder.com/120x48.png?text=Palmstone', href: '/contact' },
    { name: 'Skyline Builders', logo: 'https://via.placeholder.com/120x48.png?text=Skyline', href: '/contact' },
    { name: 'Heritage Realty', logo: 'https://via.placeholder.com/120x48.png?text=Heritage', href: '/contact' },
    { name: 'Marina Projects', logo: 'https://via.placeholder.com/120x48.png?text=Marina', href: '/contact' },
    { name: 'Cedar & Co.', logo: 'https://via.placeholder.com/120x48.png?text=Cedar', href: '/contact' },
  ]

  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">BUILT BY THE BEST</p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">Featured Developers</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Curated developer partners delivering premium communities and long-term value.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {developers.map((d) => (
            <Link
              key={d.name}
              href={d.href}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-5 flex items-center justify-center hover:shadow-md transition"
              aria-label={d.name}
            >
              <Image src={d.logo} alt={d.name} width={120} height={48} className="object-contain" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
