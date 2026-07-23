import Link from 'next/link'

export default function WorkspacePlaceholder({
  title,
  description,
  primaryHref,
  primaryLabel,
}: {
  title: string
  description: string
  primaryHref: string
  primaryLabel: string
}) {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <section className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">MillionFlats workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        <Link href={primaryHref} className="mt-6 inline-flex h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800">
          {primaryLabel}
        </Link>
      </section>
    </div>
  )
}
