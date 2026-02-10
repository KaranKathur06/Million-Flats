'use client'

import Link from 'next/link'

export default function FinalCTA({
  headline,
  primary,
  secondary,
}: {
  headline: string
  primary: { label: string; href: string }
  secondary: { label: string; href: string }
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-8">
      <div className="max-w-3xl">
        <div className="text-2xl md:text-3xl font-serif font-bold text-dark-blue">{headline}</div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={primary.href}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-dark-blue px-6 font-semibold text-white hover:bg-dark-blue/90"
          >
            {primary.label}
          </Link>
          <Link
            href={secondary.href}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 bg-white px-6 font-semibold text-dark-blue hover:bg-gray-50"
          >
            {secondary.label}
          </Link>
        </div>
      </div>
    </div>
  )
}
