'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function Header() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/LOGO.jpeg"
              alt="Millionflats"
              width={34}
              height={34}
              className="rounded-md w-8 h-8 md:w-[34px] md:h-[34px]"
              priority
            />
            <span className="text-dark-blue font-semibold text-base md:text-lg tracking-wide">millionflats</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Home
            </Link>
            <Link
              href="/properties"
              className={`text-sm font-medium transition-colors ${
                isActive('/properties') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Properties
            </Link>
            <Link
              href="/sell"
              className={`text-sm font-medium transition-colors ${
                isActive('/sell') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Sell
            </Link>
            <Link
              href="/buy"
              className={`text-sm font-medium transition-colors ${
                isActive('/buy') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Buy
            </Link>
            <Link
              href="/rent"
              className={`text-sm font-medium transition-colors ${
                isActive('/rent') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Rent
            </Link>
            <Link
              href="/market-analysis"
              className={`text-sm font-medium transition-colors ${
                isActive('/market-analysis') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Market Analysis
            </Link>
            <Link
              href="/explore-3d"
              className={`text-sm font-medium transition-colors ${
                isActive('/explore-3d') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Explore in 3D
            </Link>
            <Link
              href="/tokenized"
              className={`text-sm font-medium transition-colors ${
                isActive('/tokenized') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Tokenized
            </Link>
            <Link
              href="/about"
              className={`text-sm font-medium transition-colors ${
                isActive('/about') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              About
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors ${
                isActive('/contact') ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
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
              Agent Portal
            </Link>
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
            <Link
              href="/"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/properties"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/properties') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Properties
            </Link>
            <Link
              href="/sell"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/sell') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Sell
            </Link>
            <Link
              href="/buy"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/buy') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Buy
            </Link>
            <Link
              href="/rent"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/rent') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Rent
            </Link>
            <Link
              href="/market-analysis"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/market-analysis') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Market Analysis
            </Link>
            <Link
              href="/explore-3d"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/explore-3d') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Explore in 3D
            </Link>
            <Link
              href="/tokenized"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/tokenized') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Tokenized
            </Link>
            <Link
              href="/about"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/about') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              About
            </Link>
            <Link
              href="/contact"
              className={`block px-4 py-3 rounded-xl text-sm font-medium ${
                isActive('/contact') ? 'bg-gray-100 text-dark-blue' : 'text-gray-700'
              }`}
              onClick={() => setMobileOpen(false)}
            >
              Contact
            </Link>

            <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
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
                Agent Portal
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

