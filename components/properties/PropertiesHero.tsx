import Image from 'next/image'
import Link from 'next/link'

export default function PropertiesHero({ title, subtitle, breadcrumb, image }: any) {
  return (
    <section className="relative overflow-hidden bg-[#0c1d37] text-white">
      <div className="absolute inset-0 opacity-25">
        <Image src={image?.src || '/HOMEPAGE.jpg'} alt="" fill priority className="object-cover" sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(47,78,112,0.55),transparent_55%),linear-gradient(115deg,rgba(8,22,42,0.98),rgba(13,34,61,0.84))]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-12 text-center sm:px-6 lg:px-8 lg:pb-28 lg:pt-16">
        {breadcrumb?.length ? (
          <nav className="mb-8 text-sm text-white/65" aria-label="Breadcrumb">
            {breadcrumb.map((item: any, index: number) => (
              <span key={item.href}>
                <Link href={item.href} className="hover:text-white">{item.label}</Link>
                {index < breadcrumb.length - 1 ? <span className="mx-2">/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent-yellow">Property Discovery</p>
        <h1 className="mx-auto mt-5 max-w-3xl font-serif text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">{subtitle}</p>
      </div>
    </section>
  )
}
