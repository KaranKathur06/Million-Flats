import Image from 'next/image'
import Link from 'next/link'
import HeroSearch from '@/components/HeroSearch'
import FeaturedProperties from '@/components/FeaturedProperties'
import WhyMillionflats from '@/components/WhyMillionflats'
import FeaturedLocations from '@/components/FeaturedLocations'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[700px] lg:h-[800px]">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80"
            alt="Luxury Home"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
        <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6">
              Find Your Next Million-Dollar Home
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8">
              Discover exceptional luxury properties across the UAE, curated for discerning investors and buyers.
            </p>
            <HeroSearch />
          </div>
        </div>
      </section>

      {/* Why Millionflats Section */}
      <WhyMillionflats />

      {/* Featured Properties */}
      <FeaturedProperties />

      {/* Featured Locations */}
      <FeaturedLocations />

      {/* CTA Section */}
      <section className="bg-dark-blue py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4">
            Ready to List Your Property?
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            Join hundreds of premium agents worldwide who trust millionflats to sell luxury properties at the highest value.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/agent/register"
              className="bg-accent-yellow text-dark-blue px-8 py-3 rounded-lg font-semibold hover:bg-opacity-90 transition-colors"
            >
              Become an Agent
            </Link>
            <Link
              href="/contact"
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-dark-blue transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

