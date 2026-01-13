import Image from 'next/image'
import Link from 'next/link'

export default function FeaturedAgencies() {
  const agencies = [
    {
      name: 'Orchid Estates',
      tagline: 'Premium brokerage for signature homes',
      logo: 'https://via.placeholder.com/96x96.png?text=OE',
      href: '/contact',
    },
    {
      name: 'Blue Harbour Realty',
      tagline: 'Luxury living across India & UAE',
      logo: 'https://via.placeholder.com/96x96.png?text=BHR',
      href: '/contact',
    },
    {
      name: 'Sapphire Property Co.',
      tagline: 'Curated residences for global buyers',
      logo: 'https://via.placeholder.com/96x96.png?text=SPC',
      href: '/contact',
    },
    {
      name: 'Crown Avenue',
      tagline: 'Trusted advisors for high-value deals',
      logo: 'https://via.placeholder.com/96x96.png?text=CA',
      href: '/contact',
    },
    {
      name: 'Luxe Landmark',
      tagline: 'Market intelligence, premium outcomes',
      logo: 'https://via.placeholder.com/96x96.png?text=LL',
      href: '/contact',
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">TRUSTED PARTNERS</p>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-3">Featured Agencies</h2>
            <p className="text-lg text-gray-600 max-w-2xl">
              A selection of agencies known for discretion, quality inventory, and exceptional service.
            </p>
          </div>
          <Link href="/contact" className="hidden md:inline-flex text-sm font-semibold text-dark-blue hover:underline">
            Become a Partner
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
          {agencies.map((agency) => (
            <Link
              key={agency.name}
              href={agency.href}
              className="min-w-[280px] sm:min-w-[320px] snap-start bg-gray-50 border border-gray-200 rounded-2xl p-6 hover:bg-white hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                  <Image src={agency.logo} alt={agency.name} width={56} height={56} className="object-cover" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-dark-blue">{agency.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{agency.tagline}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="md:hidden mt-8">
          <Link href="/contact" className="inline-flex text-sm font-semibold text-dark-blue hover:underline">
            Become a Partner
          </Link>
        </div>
      </div>
    </section>
  )
}
