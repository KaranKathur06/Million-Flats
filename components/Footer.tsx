'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="relative w-[160px] h-10">
                <Image src="/LOGO.png" alt="MillionFlats" fill className="object-contain" sizes="160px" />
              </span>
            </Link>
            <p className="mt-4 text-dark-blue font-semibold text-xl">MillionFlats Private Limited.</p>
            <p className="mt-2 text-gray-600 text-sm max-w-xl">
              Premium luxury real estate for discerning global investors and buyers.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
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
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ecosystem / Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/ecosystem-partners"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors"
                >
                  Ecosystem Partners
                </Link>
              </li>
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

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">User / Agent</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/buy" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link href="/agents" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  Find an Agent
                </Link>
              </li>
              <li>
                <Link href="/agent/login" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  Agent Login
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            © 2026 MillionFlats Private Limited. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

