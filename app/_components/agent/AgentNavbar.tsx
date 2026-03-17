'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AgentStatus, agentModuleAccessMap } from '@/lib/agentLifecycle'
import { checkAgentAccess, NavItemKey } from '@/lib/agentRouteGuard'
import AccessGuardModal from './AccessGuardModal'

interface AgentNavbarProps {
  agentStatus: AgentStatus
  agentName: string
  agentEmail: string
  profileImageUrl?: string
  profileCompletion?: number
}

// Navigation items - clean structure (no Profile in main nav)
const NAV_ITEMS: { key: NavItemKey; label: string; href: string; module: 'overview' | 'properties' | 'leads' | 'verification' | 'subscription' }[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/agent/dashboard', module: 'overview' },
  { key: 'properties', label: 'Properties', href: '/agent/properties', module: 'properties' },
  { key: 'leads', label: 'Leads', href: '/agent/leads', module: 'leads' },
  { key: 'verification', label: 'Verification', href: '/agent/verification', module: 'verification' },
  { key: 'subscription', label: 'Subscription', href: '/agent/subscription', module: 'subscription' },
]

// Inline SVG icons - minimal style
const Icons = {
  Menu: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  User: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
    </svg>
  ),
}

export default function AgentNavbar({
  agentStatus,
  agentName,
  agentEmail,
  profileImageUrl,
  profileCompletion = 0,
}: AgentNavbarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false)
  const [accessModal, setAccessModal] = useState<{ isOpen: boolean; navKey: NavItemKey }>({
    isOpen: false,
    navKey: 'dashboard',
  })

  const accessMap = agentModuleAccessMap(agentStatus)

  // Get initials for avatar
  const initials = agentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsProfileDropdownOpen(false)
    if (isProfileDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isProfileDropdownOpen])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  const handleNavClick = (navKey: NavItemKey, e: React.MouseEvent) => {
    const result = checkAgentAccess(agentStatus, navKey)
    if (!result.canAccess) {
      e.preventDefault()
      setAccessModal({ isOpen: true, navKey })
    }
  }

  const navItem = NAV_ITEMS.find(n => n.key === accessModal.navKey)
  const accessResult = accessModal.navKey ? checkAgentAccess(agentStatus, accessModal.navKey) : null

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100" style={{ height: '64px' }}>
        <div className="h-full max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between">
          {/* Logo */}
          <Link href="/agent/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MF</span>
            </div>
            <span className="text-base font-semibold text-gray-900">MillionFlats</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center" style={{ gap: '28px' }}>
            {NAV_ITEMS.map((item) => {
              const isActive = pathname ? (pathname === item.href || pathname.startsWith(item.href + '/')) : false
              const hasAccess = accessMap[item.module]
              const isVerification = item.key === 'verification'

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={(e) => !hasAccess && handleNavClick(item.key, e)}
                  className={`relative text-[15px] font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600'
                      : hasAccess
                      ? 'text-gray-600 hover:text-gray-900'
                      : 'text-gray-400 hover:text-gray-500'
                  }`}
                  style={{ paddingBottom: isActive ? '6px' : undefined }}
                >
                  {item.label}
                  {/* Active underline */}
                  {isActive && (
                    <span className="absolute -bottom-[6px] left-0 right-0 h-0.5 bg-blue-600" />
                  )}
                  {/* Dot indicator for incomplete verification */}
                  {isVerification && !hasAccess && (
                    <span className="absolute -top-1 -right-2 w-2 h-2 bg-amber-400 rounded-full" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Profile Completion Badge */}
            {profileCompletion < 100 && (
              <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-gray-50 rounded-full">
                <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-600">{profileCompletion}%</span>
              </div>
            )}

            {/* Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsProfileDropdownOpen(!isProfileDropdownOpen)
                }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt={agentName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-blue-700 font-semibold text-xs">{initials}</span>
                  )}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">{initials}</span>
                <Icons.ChevronDown />
              </button>

              {/* Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1.5">
                  <Link
                    href="/agent/profile"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    <Icons.User />
                    Profile
                  </Link>
                  <Link
                    href="/agent/verification"
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setIsProfileDropdownOpen(false)}
                  >
                    <Icons.Shield />
                    Verification Status
                  </Link>
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <a
                      href="/api/auth/signout"
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Icons.Logout />
                      Sign Out
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-50"
            >
              {isMobileMenuOpen ? <Icons.Close /> : <Icons.Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname ? (pathname === item.href || pathname.startsWith(item.href + '/')) : false
                const hasAccess = accessMap[item.module]

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={(e) => !hasAccess && handleNavClick(item.key, e)}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                      isActive
                        ? 'bg-blue-50 text-blue-600'
                        : hasAccess
                        ? 'text-gray-700 hover:bg-gray-50'
                        : 'text-gray-400'
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                    {!hasAccess && (
                      <span className="text-xs text-amber-600">Locked</span>
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Mobile Profile Completion */}
            {profileCompletion < 100 && (
              <div className="px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Profile Completion</span>
                  <span className="text-sm font-medium text-blue-600">{profileCompletion}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${profileCompletion}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Access Guard Modal */}
      {accessResult && navItem && (
        <AccessGuardModal
          isOpen={accessModal.isOpen}
          onClose={() => setAccessModal({ isOpen: false, navKey: 'dashboard' })}
          accessResult={accessResult}
          featureName={navItem.label}
        />
      )}
    </>
  )
}
