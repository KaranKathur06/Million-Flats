'use client'

import { useState } from 'react'
import ContactForm from '@/components/ContactForm'
import ContactInfo from '@/components/ContactInfo'
import FAQ from '@/components/FAQ'
import MeetingBookingFlow from '@/components/meetingBooking/MeetingBookingFlow'

type MeetingCategory = 'THREE_D_TOUR' | 'AGENT_REGISTRATION' | 'AGENCY_REGISTRATION' | 'DEVELOPER_REGISTRATION' | 'PROPERTY_BUYER' | 'PROPERTY_SELLER' | 'ADVERTISEMENT' | 'ECOSYSTEM_PARTNERS'

const MEETING_CATEGORIES: Array<{ value: MeetingCategory; label: string }> = [
  { value: 'PROPERTY_BUYER', label: 'Property Buyer' },
  { value: 'PROPERTY_SELLER', label: 'Property Seller' },
  { value: 'AGENT_REGISTRATION', label: 'Agent Registration' },
  { value: 'AGENCY_REGISTRATION', label: 'Agency Registration' },
  { value: 'DEVELOPER_REGISTRATION', label: 'Developer Registration' },
  { value: 'ADVERTISEMENT', label: 'Advertisement Inquiry' },
  { value: 'THREE_D_TOUR', label: '3D Tour Inquiry' },
  { value: 'ECOSYSTEM_PARTNERS', label: 'Ecosystem Partnerships' },
]

export default function ContactPage() {
  const [showBookingFlow, setShowBookingFlow] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<MeetingCategory>('PROPERTY_BUYER')

  const handleBookingClick = () => {
    setShowBookingFlow(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-dark-blue mb-4">
            Get in Touch
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Have questions? Our team is here to help. Reach out and let&apos;s discuss your luxury real estate goals.
          </p>
        </div>

        {/* Contact Form and Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          <ContactForm />
          <ContactInfo />
        </div>

        <section className="mb-16 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-dark-blue/60">Need a personalized discussion?</p>
            <h2 className="mt-3 text-2xl font-serif font-bold text-dark-blue">Schedule a Google Meet with our team</h2>
            <p className="mt-3 text-gray-600">
              Book a 30-minute meeting between 10:00 AM and 8:00 PM. We will confirm your preferred slot and send the Google Meet link.
            </p>

            {!showBookingFlow ? (
              <div className="mt-6 space-y-4">
                <div>
                  <label htmlFor="meeting-purpose" className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Purpose
                  </label>
                  <select
                    id="meeting-purpose"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as MeetingCategory)}
                    className="w-full max-w-md rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-dark-blue focus:ring-2 focus:ring-dark-blue/20 transition-all"
                  >
                    {MEETING_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleBookingClick}
                  className="inline-flex items-center rounded-full bg-dark-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-dark-blue/90"
                >
                  Book Meeting
                </button>
              </div>
            ) : null}
          </div>

          {showBookingFlow ? (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gradient-to-br from-dark-blue to-[#0e2a58] p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">Book a meeting</h3>
                  <p className="text-sm text-white/70">
                    {MEETING_CATEGORIES.find((c) => c.value === selectedCategory)?.label} — Select a date and time that works for you.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBookingFlow(false)}
                  className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <MeetingBookingFlow category={selectedCategory} />
            </div>
          ) : null}
        </section>

        {/* FAQ Section */}
        <FAQ />
      </div>
    </div>
  )
}

