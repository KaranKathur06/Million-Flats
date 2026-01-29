'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'

export default function Header() {
  const pathname = usePathname() ?? ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const { data: session, status } = useSession()

  const role = String((session?.user as any)?.role || '').toUpperCase()
  const isAuthed = status === 'authenticated'
  const isAgent = isAuthed && role === 'AGENT'
  const isUser = isAuthed && role === 'USER'

  const publicLinks = [
    { href: '/', label: 'Home' },
    { href: '/sell', label: 'Sell' },
    { href: '/buy', label: 'Buy' },
    { href: '/rent', label: 'Rent' },
  ]

  const userLinks = [
    { href: '/', label: 'Home' },
    { href: '/sell', label: 'Sell' },
    { href: '/buy', label: 'Buy' },
    { href: '/rent', label: 'Rent' },
    { href: '/market-analysis', label: 'Market Analysis' },
    { href: '/explore-3d', label: 'Explore in 3D' },
    { href: '/tokenized', label: 'Tokenized' },
  ]

  const agentLinks = [
    { href: '/', label: 'Home' },
    { href: '/agent-portal', label: 'Agent Portal' },
  ]

  const navLinks = !isAuthed ? publicLinks : isAgent ? agentLinks : userLinks

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

  useEffect(() => {
    if (!profileOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false)
    }

    const onMouseDown = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null
      if (!el) return
      if (el.closest('[data-profile-menu]')) return
      setProfileOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('mousedown', onMouseDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('mousedown', onMouseDown)
    }
  }, [profileOpen])

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/LOGO.jpeg"
              alt="Millionflats"
              width={40}
              height={40}
              className="rounded-md w-10 h-10 md:w-[40px] md:h-[40px]"
              priority
            />
          </Link>

          {/* Navigation */}
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
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!isAuthed ? (
              <>
                <Link
                  href="/user/login"
                  className="text-sm font-medium text-gray-600 hover:text-dark-blue transition-colors"
                >
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
                {isUser ? (
                  <div className="relative" data-profile-menu>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-dark-blue transition-colors"
                      onClick={() => setProfileOpen((v) => !v)}
                      aria-expanded={profileOpen}
                      aria-haspopup="menu"
                    >
                      <span>Profile</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {profileOpen && (
                      <div
                        className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-200 bg-white shadow-lg p-2"
                        role="menu"
                      >
                        <Link
                          href="/profile"
                          className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                        >
                          My Profile
                        </Link>
                        <Link
                          href="/settings"
                          className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                        >
                          Settings
                        </Link>
                        <button
                          type="button"
                          className="w-full text-left block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                          role="menuitem"
                          onClick={() => {
                            setProfileOpen(false)
                            signOut({ callbackUrl: '/' })
                          }}
                        >
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-600 hover:text-dark-blue transition-colors"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Logout
                  </button>
                )}
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

            <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
              {!isAuthed ? (
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
                  {isUser && (
                    <>
                      <Link
                        href="/profile"
                        className="block px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50"
                        onClick={() => setMobileOpen(false)}
                      >
                        My Profile
                      </Link>
                      <Link
                        href="/settings"
                        className="block px-4 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-50"
                        onClick={() => setMobileOpen(false)}
                      >
                        Settings
                      </Link>
                    </>
                  )}
                  <button
                    type="button"
                    className="w-full text-left block px-4 py-3 rounded-xl text-sm font-semibold text-dark-blue bg-gray-100"
                    onClick={() => {
                      setMobileOpen(false)
                      signOut({ callbackUrl: '/' })
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

