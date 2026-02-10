import React from 'react'

export default function EcosystemSection({
  title,
  children,
  description,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="py-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-dark-blue">{title}</h2>
          {description ? <p className="mt-2 text-gray-600">{description}</p> : null}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}
