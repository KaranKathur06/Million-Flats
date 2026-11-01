'use client'

import { useState } from 'react'
import type { PartnerReviewItem } from './types'

type PartnerTestimonialsProps = {
  reviews: PartnerReviewItem[]
  partnerName: string
}

export default function PartnerTestimonials({ reviews, partnerName }: PartnerTestimonialsProps) {
  const [index, setIndex] = useState(0)

  if (reviews.length === 0) return null

  const current = reviews[index]
  const filledStars = Math.max(0, Math.min(5, Math.floor(current.rating ?? 0)))

  return (
    <section id="partner-reviews" className="scroll-mt-28 py-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">Client feedback</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          Reviews of {partnerName}
        </h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {current.rating != null && (
          <div className="flex items-center gap-2 text-sm" aria-label={`${current.rating} out of 5 stars`}>
            <span className="tracking-wider text-[#b77900]" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, star) => (
                <span key={star}>{star < filledStars ? '★' : '☆'}</span>
              ))}
            </span>
            <span className="font-semibold text-[#1e3a5f]">{current.rating.toFixed(1)} / 5</span>
          </div>
        )}
        <blockquote className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
          &ldquo;{current.review}&rdquo;
        </blockquote>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
          <div>
            <div className="font-semibold text-[#1e3a5f]">{current.reviewerName}</div>
            {(current.location || current.projectType) && (
              <div className="mt-1 text-sm text-slate-500">
                {[current.location, current.projectType].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          {reviews.length > 1 && (
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Previous review"
                onClick={() => setIndex((i) => (i - 1 + reviews.length) % reviews.length)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-[#1e3a5f] hover:bg-slate-50"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next review"
                onClick={() => setIndex((i) => (i + 1) % reviews.length)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-[#1e3a5f] hover:bg-slate-50"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
