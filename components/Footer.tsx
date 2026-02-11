'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 lg:[grid-template-columns:2fr_1fr_1fr_1fr_1fr] gap-10">
          <div className="lg:pr-10">
            <div className="inline-block">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="relative w-10 h-10 shrink-0">
                  <Image src="/LOGO.png" alt="MillionFlats" fill className="object-contain" sizes="40px" />
                </span>
                <span className="text-dark-blue font-semibold text-xl">MillionFlats Pvt Ltd.</span>
              </Link>
              <div className="mt-3 text-gray-600 text-sm leading-relaxed">
                <div>Premium luxury real estate platform</div>
                <div>For discerning global investors</div>
                <div>Buyers and verified professionals</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">
              Verix System<sup>™</sup>
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/verix/view" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  VerixView<sup>™</sup>
                </Link>
              </li>
              <li>
                <Link href="/verix/shield" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  VerixShield<sup>™</sup>
                </Link>
              </li>
              <li>
                <Link href="/verix/index" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  VerixIndex<sup>™</sup>
                </Link>
              </li>
              <li>
                <Link href="/verix/title" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  VerixTitle<sup>™</sup>
                </Link>
              </li>
              <li>
                <Link href="/verix/pro" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  VerixPro<sup>™</sup>
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ecosystem / Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/ecosystem-partners" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
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
                <Link href="/ecosystem-partners/packers-movers" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
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
                <Link href="/ecosystem-partners/vastu-feng-shui" className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
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
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-600 text-sm">
            © 2026 MillionFlats Pvt Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

