'use client'

import { useState } from 'react'
import ContactForm from '@/components/ContactForm'
import ContactInfo from '@/components/ContactInfo'
import FAQ from '@/components/FAQ'

export default function ContactPage() {
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

        {/* FAQ Section */}
        <FAQ />
      </div>
    </div>
  )
}

