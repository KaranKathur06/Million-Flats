import Image from 'next/image'
import Link from 'next/link'

export default function FeaturedAgents() {
  const agents = [
    {
      name: 'Ananya Kapoor',
      location: 'Mumbai, India',
      photo: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&q=80',
    },
    {
      name: 'Omar Hassan',
      location: 'Dubai, UAE',
      photo: 'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&q=80',
    },
    {
      name: 'Ishaan Verma',
      location: 'Bangalore, India',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    },
    {
      name: 'Sara Al Noor',
      location: 'Abu Dhabi, UAE',
      photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=80',
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider mb-2">LOCAL EXPERTS</p>
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">Featured Agents</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Work with specialists who understand micro-markets, pricing, and high-touch service.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {agents.map((agent) => (
            <div key={agent.name} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
              <div className="relative h-56">
                <Image src={agent.photo} alt={agent.name} fill className="object-cover" sizes="(max-width: 1024px) 50vw, 25vw" />
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-dark-blue">{agent.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{agent.location}</p>
                <Link
                  href="/contact"
                  className="mt-5 inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-opacity-90 transition"
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
