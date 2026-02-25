'use client'

import Link from 'next/link'
import Image from 'next/image'
import GatedActionLink from '@/components/GatedActionLink'

export default function Footer() {
  return (
    <footer className="w-full bg-gray-50 border-t border-gray-200">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 lg:[grid-template-columns:2.1fr_1fr_1.6fr_1fr_1fr_0.9fr] gap-8 lg:gap-4">
          <div className="lg:pr-6">
            <div className="inline-block">
              <Link href="/" className="inline-flex items-center gap-3">
                <span className="relative w-10 h-10 shrink-0">
                  <Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain" sizes="40px" />
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
                <GatedActionLink href="/verix/view" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  VerixView<sup>™</sup>
                </GatedActionLink>
              </li>
              <li>
                <GatedActionLink href="/verix/shield" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  VerixShield<sup>™</sup>
                </GatedActionLink>
              </li>
              <li>
                <GatedActionLink href="/verix/index" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  VerixIndex<sup>™</sup>
                </GatedActionLink>
              </li>
              <li>
                <GatedActionLink href="/verix/title" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  VerixTitle<sup>™</sup>
                </GatedActionLink>
              </li>
              <li>
                <GatedActionLink href="/verix/pro" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  VerixPro<sup>™</sup>
                </GatedActionLink>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ecosystem  Partners</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/ecosystem-partners/home-loans-finance"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap"
                >
                  Home Loans &amp; Finance
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/legal-documentation"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap"
                >
                  Legal &amp; Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/property-insurance"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap"
                >
                  Property Insurance
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/interior-design-renovation"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap"
                >
                  Interior Design &amp; Renovation
                </Link>
              </li>
              <li>
                <Link href="/ecosystem-partners/packers-movers" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Packers &amp; Movers
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/property-management"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap"
                >
                  Property Management
                </Link>
              </li>
              <li>
                <Link href="/ecosystem-partners/vastu-feng-shui" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Vastu / Feng Shui 
                </Link>
              </li>
              <li>
                <Link href="/ecosystem-partners/tiles-surface-finishing" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Tiles &amp; Surface Finishing
                </Link>
              </li>
              <li>
                <Link
                  href="/ecosystem-partners/hardware-architectural-fittings"
                  className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap"
                >
                  Hardware &amp; Architectural Fittings
                </Link>
              </li>
              <li>
                <Link href="/ecosystem-partners/cement-structural" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Cement &amp; Structural
                </Link>
              </li>
              <li>
                <Link href="/ecosystem-partners/smart-home-automation" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Smart Home &amp; Automation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">User / Agent</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/buy" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link href="/agents" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Find an Agent
                </Link>
              </li>
              <li>
                <Link href="/agent/login" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Agent Login
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Terms and Conditions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  FAQ
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

