'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import GatedActionLink from '@/components/GatedActionLink'
import FooterTrust from '@/components/analytics/FooterTrust'
import { socialLinks } from '@/config/socialLinks'

/* ── Mobile-only accordion section ── */
function AccordionSection({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-200 md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <ul className="pb-4 space-y-3">
          {children}
        </ul>
      )}
    </div>
  )
}

export default function Footer() {
  return (
    <footer className="relative z-10 w-full bg-gray-50 border-t border-gray-200 mf-footer-mobile-clearance">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-12">

        {/* ── Desktop: 6-column grid ── */}
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-6 lg:[grid-template-columns:2.1fr_1fr_1.6fr_1.2fr_1fr_0.9fr] gap-8 lg:gap-4">

          {/* Brand */}
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

          {/* AI System */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">AI System<sup>™</sup></h3>
            <ul className="space-y-2">
              {[
                { href: '/ai/view', label: 'AIView™' },
                { href: '/ai/shield', label: 'AIShield™' },
                { href: '/ai/index', label: 'AIIndex™' },
                { href: '/ai/title', label: 'AITitle™' },
                { href: '/ai/pro', label: 'AIPro™' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <GatedActionLink href={href} className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                    {label}
                  </GatedActionLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Ecosystem Partners */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Ecosystem Partners</h3>
            <ul className="space-y-2">
              {[
                { href: '/ecosystem-partners/home-loans-finance', label: 'Home Loans & Finance' },
                { href: '/ecosystem-partners/legal-documentation', label: 'Legal & Documentation' },
                { href: '/ecosystem-partners/property-insurance', label: 'Property Insurance' },
                { href: '/ecosystem-partners/interior-design-renovation', label: 'Interior Design & Renovation' },
                { href: '/ecosystem-partners/packers-movers', label: 'Packers & Movers' },
                { href: '/ecosystem-partners/property-management', label: 'Property Management' },
                { href: '/ecosystem-partners/vastu-feng-shui', label: 'Vastu / Feng Shui' },
                { href: '/ecosystem-partners/tiles-surface-finishing', label: 'Tiles & Surface Finishing' },
                { href: '/ecosystem-partners/hardware-architectural-fittings', label: 'Hardware & Architectural Fittings' },
                { href: '/ecosystem-partners/cement-structural', label: 'Cement & Structural' },
                { href: '/ecosystem-partners/smart-home-automation', label: 'Smart Home & Automation' },
                { href: '/ecosystem-partners/technology-partners', label: 'Technology Partners' },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Professionals — replaces "User / Agent" */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Professionals</h3>
            <ul className="space-y-2">
              <li><Link href="/buy" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Browse Properties</Link></li>
              <li><Link href="/projects" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Browse Projects</Link></li>
              <li><Link href="/agents" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Find an Agent</Link></li>
              <li><Link href="/developers" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Explore Developers</Link></li>
              <li><Link href="/agencies" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Explore Agencies</Link></li>
              <li><Link href="/agent/register" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Become an Agent</Link></li>
              <li><Link href="/developer/auth" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Become a Developer</Link></li>
              <li><Link href="/agency/auth" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Become an Agency</Link></li>
              <li><Link href="/agents/pricing" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Agent Pricing</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">About</Link></li>
              <li><Link href="/contact" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Contact</Link></li>
              <li><Link href="/privacy" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Terms and Conditions</Link></li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link href="/faq" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">FAQ</Link></li>
              <li><Link href="/blogs" className="text-gray-600 hover:text-dark-blue text-sm transition-colors whitespace-nowrap">Blog</Link></li>
            </ul>
          </div>
        </div>

        {/* ── Mobile: accordion ── */}
        <div className="md:hidden">
          {/* Brand (always visible on mobile) */}
          <div className="pb-6 mb-2">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="relative w-9 h-9 shrink-0">
                <Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain" sizes="36px" />
              </span>
              <span className="text-dark-blue font-semibold text-lg">MillionFlats Pvt Ltd.</span>
            </Link>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Premium luxury real estate platform for discerning global investors.
            </p>
          </div>

          <AccordionSection title={<>AI System<sup>™</sup></>}>
            {[
              { href: '/ai/view', label: 'AIView™' },
              { href: '/ai/shield', label: 'AIShield™' },
              { href: '/ai/index', label: 'AIIndex™' },
              { href: '/ai/title', label: 'AITitle™' },
              { href: '/ai/pro', label: 'AIPro™' },
            ].map(({ href, label }) => (
              <li key={href}>
                <GatedActionLink href={href} className="text-gray-600 hover:text-dark-blue text-sm transition-colors">
                  {label}
                </GatedActionLink>
              </li>
            ))}
          </AccordionSection>

          <AccordionSection title="Ecosystem Partners">
            {[
              { href: '/ecosystem-partners/home-loans-finance', label: 'Home Loans & Finance' },
              { href: '/ecosystem-partners/legal-documentation', label: 'Legal & Documentation' },
              { href: '/ecosystem-partners/property-insurance', label: 'Property Insurance' },
              { href: '/ecosystem-partners/interior-design-renovation', label: 'Interior Design & Renovation' },
              { href: '/ecosystem-partners/packers-movers', label: 'Packers & Movers' },
              { href: '/ecosystem-partners/property-management', label: 'Property Management' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-gray-600 hover:text-dark-blue text-sm transition-colors">{label}</Link>
              </li>
            ))}
          </AccordionSection>

          <AccordionSection title="Professionals">
            {[
              { href: '/buy', label: 'Browse Properties' },
              { href: '/projects', label: 'Browse Projects' },
              { href: '/agents', label: 'Find an Agent' },
              { href: '/developers', label: 'Explore Developers' },
              { href: '/agencies', label: 'Explore Agencies' },
              { href: '/agent/register', label: 'Become an Agent' },
              { href: '/developer/auth', label: 'Become a Developer' },
              { href: '/agency/auth', label: 'Become an Agency' },
              { href: '/agents/pricing', label: 'Agent Pricing' },
              { href: '/contact', label: 'Support' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-gray-600 hover:text-dark-blue text-sm transition-colors">{label}</Link>
              </li>
            ))}
          </AccordionSection>

          <AccordionSection title="Company">
            {[
              { href: '/about', label: 'About' },
              { href: '/contact', label: 'Contact' },
              { href: '/privacy', label: 'Privacy Policy' },
              { href: '/terms', label: 'Terms and Conditions' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-gray-600 hover:text-dark-blue text-sm transition-colors">{label}</Link>
              </li>
            ))}
          </AccordionSection>

          <AccordionSection title="Resources">
            {[
              { href: '/faq', label: 'FAQ' },
              { href: '/blogs', label: 'Blog' },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-gray-600 hover:text-dark-blue text-sm transition-colors">{label}</Link>
              </li>
            ))}
          </AccordionSection>
        </div>

        {/* Trust metrics */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <FooterTrust />
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-600 text-sm text-center md:text-left">
            © 2026 MillionFlats Pvt Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            {socialLinks.map((link) => {
              const isStrokeIcon = ['Instagram', 'LinkedIn', 'Facebook', 'YouTube'].includes(link.name)
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mf-touch-target inline-flex items-center justify-center text-gray-400 ${link.hoverColor} hover:-translate-y-0.5 transition-all duration-300`}
                  aria-label={link.ariaLabel}
                >
                  <svg
                    width="22" height="22" viewBox="0 0 24 24"
                    fill={isStrokeIcon ? 'none' : 'currentColor'}
                    stroke={isStrokeIcon ? 'currentColor' : 'none'}
                    strokeWidth={isStrokeIcon ? '2' : undefined}
                    strokeLinecap={isStrokeIcon ? 'round' : undefined}
                    strokeLinejoin={isStrokeIcon ? 'round' : undefined}
                    dangerouslySetInnerHTML={{ __html: link.svgContent }}
                  />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
