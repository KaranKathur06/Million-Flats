'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { getHomeRouteForRole } from '@/lib/roleHomeRoute'

type NavItem = { href: string; label: React.ReactNode }

async function doLogout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include', cache: 'no-store' }).catch(() => null)
  window.location.replace('/')
}

export default function Header() {
  const pathname = usePathname() ?? ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, status } = useSession()

  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isAuthed = status === 'authenticated'
  const isAuthLoading = status === 'loading'
  const dashboardHref = getHomeRouteForRole(role)

  const isAgent = isAuthed && role === 'AGENT'
  const isAdminOrHigher = isAuthed && (role === 'ADMIN' || role === 'SUPERADMIN')

  const showVerfix = !isAuthed || role === 'USER'
  const verfixHref = !isAuthed ? '/auth/redirect?next=%2Fverfix-system' : '/verfix-system'

  const publicLinks: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/sell', label: 'Sell' },
    { href: '/buy', label: 'Buy' },
    { href: '/rent', label: 'Rent' },
    { href: '/agents', label: 'Find an Agent' },
    ...(showVerfix ? [{ href: verfixHref, label: <span>Verix System<sup>™</sup></span> }] : []),
  ]

  const userLinks: NavItem[] = [
    { href: '/', label: 'Home' },
    { href: '/sell', label: 'Sell' },
    { href: '/buy', label: 'Buy' },
    { href: '/rent', label: 'Rent' },
    { href: '/agents', label: 'Find an Agent' },
    ...(showVerfix ? [{ href: verfixHref, label: <span>Verix System<sup>™</sup></span> }] : []),
    { href: '/market-analysis', label: 'Market Analysis' },
  ]

  const servicesLinks: NavItem[] = [
    { href: '/explore-3d', label: 'Explore in 3D' },
    { href: '/tokenized', label: 'Tokenized' },
  ]

  const agentLinks: NavItem[] = [
    { href: '/agent/dashboard', label: 'Agent Dashboard' },
    { href: '/agent/profile', label: 'Profile' },
  ]

  const navLinks = !isAuthed ? publicLinks : isAdminOrHigher ? [] : isAgent ? agentLinks : userLinks

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center h-full">
            <span className="relative h-full w-[72px] md:w-[150px]">
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
                  className={`text-sm font-medium transition-colors ${
                    isActive(item.href) ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {servicesLinks.length > 0 ? (
                <div className="relative group">
                  <button
                    type="button"
                    className={`text-sm font-medium transition-colors inline-flex items-center gap-1 ${
                      servicesLinks.some((l) => isActive(l.href)) ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
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
                          className={`block px-4 py-3 text-sm transition-colors ${
                            isActive(s.href) ? 'bg-gray-50 text-dark-blue font-medium' : 'text-gray-700 hover:bg-gray-50 hover:text-dark-blue'
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
                <Link href="/user/login" className="text-sm font-medium text-gray-600 hover:text-dark-blue transition-colors">
                  Login
                </Link>
                <Link
                  href="/agent/login"
                  className="bg-dark-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                >
                  Agent Login
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

      <div className={`fixed inset-0 z-[60] md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute top-0 right-0 h-full w-[86%] max-w-sm bg-white shadow-2xl transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-14 px-4 border-b border-gray-200 flex items-center justify-between">
            <span className="text-dark-blue font-semibold">Menu</span>
            <button
              type="button"
              className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-200 text-dark-blue"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="p-4 space-y-2">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                  isActive(item.href) ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
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
                      className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                        isActive(s.href) ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
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
                    href="/user/login"
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-dark-blue bg-gray-100"
                    onClick={() => setMobileOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/agent/login"
                    className="block px-4 py-3 rounded-xl text-sm font-semibold text-white bg-dark-blue"
                    onClick={() => setMobileOpen(false)}
                  >
                    Agent Login
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
      </div>
    </header>
  )
}

