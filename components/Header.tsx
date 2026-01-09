'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/LOGO.jpeg"
              alt="Millionflats"
              width={34}
              height={34}
              className="rounded-md"
              priority
            />
            <span className="text-dark-blue font-semibold text-lg tracking-wide">millionflats</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors ${
                pathname === '/' ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Home
            </Link>
            <Link
              href="/properties"
              className={`text-sm font-medium transition-colors ${
                pathname === '/properties' ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Properties
            </Link>
            <Link
              href="/about"
              className={`text-sm font-medium transition-colors ${
                pathname === '/about' ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              About
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors ${
                pathname === '/contact' ? 'text-dark-blue' : 'text-gray-600 hover:text-dark-blue'
              }`}
            >
              Contact
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center space-x-4">
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
        </div>
      </div>
    </header>
  )
}

