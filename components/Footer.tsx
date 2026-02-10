'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

export default function Footer() {
  const { data: session, status } = useSession()
  const isAuthed = Boolean(session?.user)
  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isAgent = isAuthed && role === 'AGENT'
  const isAdminOrHigher = isAuthed && (role === 'ADMIN' || role === 'SUPERADMIN')
  const showVerfix = !isAuthed || role === 'USER'
  const verfixHref = !isAuthed ? '/auth/redirect?next=%2Fverfix-system' : '/verfix-system'

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <span className="relative w-[160px] h-10">
                <Image src="/LOGO.png" alt="MillionFlats" fill className="object-contain" sizes="160px" />
              </span>
              <span className="text-dark-blue font-semibold text-xl">MillionFlats Private Limited.</span>
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

          {showVerfix && !isAgent && !isAdminOrHigher && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Verfix System™</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href={verfixHref}
                    className="text-sm font-semibold text-dark-blue hover:underline"
                  >
                    Verfix System™
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
                  href="/ecosystem-partners/home-loans-finance"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Home Loans &amp; Finance
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/legal-documentation"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Legal &amp; Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/property-insurance"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Property Insurance
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/interior-design-renovation"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Interior Design &amp; Renovation
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/packers-movers"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Packers &amp; Movers
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/property-management"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Property Management
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/vastu-feng-shui"
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
                    href={getHomeRouteForRole('AGENT')}
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
            © 2026 MillionFlats Private Limited. All rights reserved.
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

