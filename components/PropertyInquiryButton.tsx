'use client'

import { useState } from 'react'
import PropertyInquiryForm from '@/components/PropertyInquiryForm'

export default function PropertyInquiryButton({
  property,
  whatsappHref,
  label = 'Contact Agent',
  className = 'inline-flex h-12 items-center justify-center rounded-xl bg-white px-6 font-semibold text-dark-blue shadow-sm hover:bg-white/95',
}: {
  property: { id: string; title: string; location: string; priceLabel: string; propertyType: string; bedrooms: number }
  whatsappHref?: string
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>{label}</button>
      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Property inquiry">
          <div className="mx-auto flex min-h-full max-w-xl items-center">
            <PropertyInquiryForm property={property} whatsappHref={whatsappHref} onClose={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  )
}
