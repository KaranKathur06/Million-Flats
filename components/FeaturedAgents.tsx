import Image from 'next/image'
import GatedActionLink from '@/components/GatedActionLink'
import { prisma } from '@/lib/prisma'

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function initials(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] || 'A'
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
  return `${first}${last}`.toUpperCase()
}

export default async function FeaturedAgents() {
  const agents = await prisma.agent
    .findMany({
      where: { approved: true },
      include: { user: true },
      orderBy: { updatedAt: 'desc' },
      take: 8,
    })
    .catch(() => [])

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

        {agents.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
            <p className="text-sm text-gray-600">No agents have been published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((a: any) => {
              const name = String(a?.user?.name || 'Agent')
              const company = String(a?.company || '').trim()
              const image = String(a?.user?.image || '').trim()
              const slug = slugify(name)
              const href = `/agents/${slug ? `${slug}-` : ''}${encodeURIComponent(String(a.id))}`
              return (
                <div key={a.id} className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="relative h-56 bg-white border-b border-gray-200 flex items-center justify-center">
                    {image ? (
                      <Image
                        src={image}
                        alt={name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                        <span className="text-xl font-semibold text-gray-700">{initials(name)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-dark-blue">{name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{company || 'MillionFlats Partner'}</p>
                    <GatedActionLink
                      href={href}
                      className="mt-5 inline-flex items-center justify-center w-full h-11 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-opacity-90 transition"
                    >
                      View Profile
                    </GatedActionLink>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
