'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function Footer() {
  const { data: session, status } = useSession()
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isAuthed = status === 'authenticated'
  const isUser = isAuthed && role === 'USER'
  const isAgent = isAuthed && role === 'AGENT'

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-dark-blue flex items-center justify-center rounded">
                <span className="text-white font-bold text-xl">M</span>
              </div>
              <span className="text-dark-blue font-semibold text-xl">millionflats</span>
            </Link>
            <p className="text-gray-600 text-sm">
              Premium luxury real estate for discerning global investors and buyers.
            </p>
            <div className="mt-4">
              <ul className="space-y-2">
                <li>
                  <Link href="/about" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {isUser && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Trust Framework (Verix™ System)</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/auth/redirect?next=/verix/view"
                    className="text-sm font-semibold text-dark-blue hover:underline"
                  >
                    VerixView™
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/redirect?next=/verix/shield"
                    className="text-sm font-semibold text-dark-blue hover:underline"
                  >
                    VerixShield™
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/redirect?next=/verix/index"
                    className="text-sm font-semibold text-dark-blue hover:underline"
                  >
                    VerixIndex™
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/redirect?next=/verix/title"
                    className="text-sm font-semibold text-dark-blue hover:underline"
                  >
                    VerixTitle™
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {/* Ecosystem Partners */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ecosystem Partners</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Home Loans &amp; Finance
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Legal &amp; Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Property Insurance
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Interior Design &amp; Renovation
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Packers &amp; Movers
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Property Management
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Vastu / Feng Shui Consultants
                </Link>
              </li>
            </ul>
          </div>

          {/* For Buyers */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">For Buyers</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/buy" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Contact Agent
                </Link>
              </li>
            </ul>
          </div>

          {/* For Agents */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">For Agents</h3>
            <ul className="space-y-2">
              {!isAgent ? (
                <li>
                  <Link
                    href="/agent/login"
                    className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                  >
                    Agent Login
                  </Link>
                </li>
              ) : (
                <li>
                  <Link
                    href="/agent-portal"
                    className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                  >
                    Agent Portal
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/contact"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            © 2025 millionflats. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

