import Link from 'next/link'
import Image from 'next/image'

const locations = [
  { name: 'Dubai', properties: 324, image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80' },
  { name: 'Abu Dhabi', properties: 278, image: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80' },
  { name: 'Sharjah', properties: 156, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80' },
  { name: 'Ajman', properties: 89, image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80' },
]

export default function FeaturedLocations() {
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">
            UAE MARKETS
          </p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">
            Featured Locations
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Explore luxury real estate across the United Arab Emirates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {locations.map((location) => (
            <Link
              key={location.name}
              href={`/properties?location=${location.name}`}
              className="relative h-64 rounded-lg overflow-hidden group"
            >
              <Image
                src={location.image}
                alt={location.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-bold mb-1">{location.name}</h3>
                <p className="text-white/90">{location.properties} properties available</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
