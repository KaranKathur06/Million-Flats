import Image from 'next/image'

const associatedCompanies = [
  { id: 'azizi', name: 'Azizi Developments', src: '/partners/azizi.jpeg', alt: 'Azizi Developments' },
  { id: 'damac', name: 'DAMAC', src: '/partners/damac.jpeg', alt: 'DAMAC' },
  { id: 'eth', name: 'ETH', src: '/partners/eth.jpeg', alt: 'ETH' },
  { id: 'metadology', name: 'MetaDology', src: '/partners/metadology.jpeg', alt: 'MetaDology' },
  { id: 'nextech', name: 'Nextech', src: '/partners/nextech.jpeg', alt: 'Nextech' },
  { id: 'yugen', name: 'Yugen', src: '/partners/yugen.jpeg', alt: 'Yugen' },
]

export default function AssociatedCompanies() {
  return (
    <section className="relative overflow-hidden bg-[#f4f5f7] py-16 sm:py-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Ecosystem
          </p>
          <h2 className="text-3xl font-black tracking-[-0.05em] text-[#0f172a] sm:text-4xl lg:text-[3rem]">
            Associated Companies
          </h2>
          <p className="mt-4 text-base text-slate-600 sm:text-lg">
            MillionFlats operates within a broader ecosystem of developers, innovators, and industry partners.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {associatedCompanies.map((company, index) => (
            <div
              key={company.id}
              className="mf-animate-fade-up group flex min-h-[150px] items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex h-[110px] w-full items-center justify-center overflow-hidden rounded-xl bg-white">
                <Image
                  src={company.src}
                  alt={company.alt}
                  width={280}
                  height={120}
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 14vw"
                  className="max-h-[86px] w-auto max-w-full object-contain opacity-90 transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
