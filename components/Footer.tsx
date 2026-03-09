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
                <Link href="/agents/pricing" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Agent Pricing
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
              <li>
                <Link href="/blog" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                  Blog
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm text-center md:text-left">
            © 2026 MillionFlats Pvt Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="https://www.instagram.com/millionflats/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E1306C] hover:-translate-y-0.5 transition-all duration-300" aria-label="Instagram">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </Link>
            <Link href="https://www.linkedin.com/company/millionflats/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0A66C2] hover:-translate-y-0.5 transition-all duration-300" aria-label="LinkedIn">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </Link>
            <Link href="https://www.facebook.com/millionflats/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1877F2] hover:-translate-y-0.5 transition-all duration-300" aria-label="Facebook">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </Link>
            <Link href="https://www.youtube.com/@MillionFlats" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#FF0000] hover:-translate-y-0.5 transition-all duration-300" aria-label="YouTube">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
            </Link>
            <Link href="https://www.millionflats.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-dark-blue hover:-translate-y-0.5 transition-all duration-300" aria-label="Website">
              <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

