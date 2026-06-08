'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { MobileOffCanvasPanel } from '@/components/responsive'
import { useSession } from 'next-auth/react'
import { getHomeRouteForRole, isAdminPanelRole } from '@/lib/roleHomeRoute'

type NavItem = { href: string; label: React.ReactNode }

async function doLogout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', cache: 'no-store' }).catch(() => null)
  window.location.replace('/')
}

export default function Header() {
  const pathname = usePathname() ?? ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, status } = useSession()

  const [mobileEl, setMobileEl] = useState<HTMLDivElement | null>(null)

  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isAuthed = status === 'authenticated'
  const isAuthLoading = status === 'loading'
  const dashboardHref = getHomeRouteForRole(role)

  const isAgent = isAuthed && role === 'AGENT'
  const isAdminOrHigher = isAuthed && isAdminPanelRole(role)
  const showServices = !isAuthed || role === 'USER'

  const showVerfix = !isAuthed || role === 'USER'
  const verfixHref = !isAuthed ? '/auth/redirect?next=%2Fai-system' : '/ai-system'

  const publicLinks: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/buy', label: 'Buy' },
    { href: '/rent', label: 'Rent' },
    { href: '/projects', label: 'Projects' },
    { href: '/agents', label: 'Find an Agent' },
    { href: '/agents/pricing', label: 'Pricing' },
    ...(showVerfix ? [{ href: verfixHref, label: <span>AI System<sup>™</sup></span> }] : []),
  ]

  const userLinks: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/buy', label: 'Buy' },
    { href: '/rent', label: 'Rent' },
    { href: '/projects', label: 'Projects' },
    { href: '/agents', label: 'Find an Agent' },
    { href: '/agents/pricing', label: 'Pricing' },
    ...(showVerfix ? [{ href: verfixHref, label: <span>AI System<sup>™</sup></span> }] : []),
    { href: '/market-analysis', label: 'Market Analysis' },
  ]

  const servicesLinks: NavItem[] = showServices
    ? [
      { href: '/services/3d-tours', label: '3D Tours' },
      { href: '/services/ai-analytics', label: 'AI Analytics' },
      { href: '/services/featured-listings', label: 'Featured Listings' },
      { href: '/services/advertising', label: 'Premium Ads' },
      { href: '/services/partnerships', label: 'Partnerships' },
    ]
    : []

  const agentLinks: NavItem[] = [
    { href: '/agent/dashboard', label: 'Agent Dashboard' },
    { href: '/agent/profile', label: 'Profile' },
  ]

  const navLinks = !isAuthed ? publicLinks : isAdminOrHigher ? [] : isAgent ? agentLinks : userLinks

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const isAgentPath = pathname === '/agent' || pathname.startsWith('/agent/')

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)

      if (e.key === 'Tab' && mobileEl) {
        const focusables = Array.from(
          mobileEl.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)

        if (focusables.length === 0) return

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement as HTMLElement | null

        if (e.shiftKey) {
          if (!active || active === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (active === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileEl, mobileOpen])

  useEffect(() => {
    if (!mobileOpen || !mobileEl) return
    window.setTimeout(() => {
      const btn = mobileEl.querySelector<HTMLElement>('button[aria-label="Close menu"]')
      btn?.focus()
    }, 0)
  }, [mobileEl, mobileOpen])

  if (isAgentPath) return null

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center h-full">
            <span className="relative h-full w-[54px] md:w-[112px]">
              <Image
                src="/LOGO.jpeg"
                alt="Millionflats"
                fill
                className="object-contain"
                sizes="150px"
                priority
              />
            </span>
          </Link>

          {/* Navigation */}
          {navLinks.length > 0 ? (
            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm font-medium transition-colors ${isActive(item.href) ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
                    }`}
                >
                  {item.label}
                </Link>
              ))}

              {servicesLinks.length > 0 ? (
                <div className="relative group">
                  <button
                    type="button"
                    className={`text-sm font-medium transition-colors inline-flex items-center gap-1 ${servicesLinks.some((l) => isActive(l.href)) ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
                      }`}
                    aria-haspopup="menu"
                  >
                    Services
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="absolute left-0 top-full pt-3 hidden group-hover:block">
                    <div className="w-56 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {servicesLinks.map((s) => (
                        <Link
                          key={s.href}
                          href={s.href}
                          className={`block px-4 py-3 text-sm transition-colors ${isActive(s.href) ? 'bg-gray-50 text-dark-blue font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-dark-blue'
                            }`}
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </nav>
          ) : (
            <div className="hidden md:block" />
          )}

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthLoading ? null : !isAuthed ? (
              <>
                <Link
                  href="/sell"
                  className="text-sm font-semibold text-white bg-[#F4B400] px-4 py-2 rounded-lg hover:bg-[#E1A800] transition-colors"
                >
                  Sell or Rent Property
                </Link>
                <Link href="/auth/login" className="text-sm font-medium text-gray-600 hover:text-dark-blue transition-colors">
                  Login
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-dark-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                >
                  Register
                </Link>
              </>
            ) : (
              <>
                {!isAdminOrHigher ? (
                  <Link
                    href={dashboardHref}
                    className="bg-dark-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="text-sm font-medium text-gray-600 hover:text-dark-blue transition-colors"
                  onClick={() => doLogout()}
                >
                  Logout
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-xl border border-gray-200 text-dark-blue"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <MobileOffCanvasPanel
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="right"
        zIndex={60}
        panelClassName="!bg-white !max-w-sm"
        header={
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 pt-[env(safe-area-inset-top)]">
            <span className="font-semibold text-dark-blue">Menu</span>
            <button
              type="button"
              className="mf-touch-target inline-flex items-center justify-center rounded-xl border border-gray-200 text-dark-blue"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        }
      >
        <div ref={setMobileEl}>
          <nav className="p-4 space-y-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 rounded-xl text-sm font-medium ${isActive(item.href) ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
                  }`}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}

            {servicesLinks.length > 0 ? (
              <div className="pt-2">
                <div className="px-4 pt-3 pb-2 text-xs font-semibold tracking-wide text-gray-500 uppercase">Services</div>
                <div className="space-y-2">
                  {servicesLinks.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      className={`block px-4 py-3 rounded-xl text-sm font-medium ${isActive(s.href) ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
                        }`}
                      onClick={() => setMobileOpen(false)}
                    >
                      {s.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
              {isAuthLoading ? null : !isAuthed ? (
                <>
                  <Link
                    href="/sell"
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[#F4B400]"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sell or Rent Property
                  </Link>
                  <Link
                    href="/auth/login"
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-dark-blue bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-white bg-dark-blue"
                    onClick={() => setMobileOpen(false)}
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={dashboardHref}
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-white bg-dark-blue"
                    onClick={() => setMobileOpen(false)}
                  >
                    Go to Dashboard
                  </Link>
                  <button
                    type="button"
                    className="w-full text-left block px-4 py-3 rounded-xl text-sm font-semibold text-dark-blue bg-gray-100"
                    onClick={() => {
                      setMobileOpen(false)
                      doLogout()
                    }}
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      </MobileOffCanvasPanel>
    </header>
  )
}

