'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AgentStatus, agentModuleAccessMap } from '@/lib/agentLifecycle'
import { AGENT_NAV_ITEMS, checkAgentAccess, NavItemKey } from '@/lib/agentRouteGuard'
import AccessGuardModal from './AccessGuardModal'

interface AgentNavbarProps {
  agentStatus: AgentStatus
  agentName: string
  agentEmail: string
  profileImageUrl?: string
  profileCompletion?: number
}

// Inline SVG icons
const Icons = {
  Menu: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  Close: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Home: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Building: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  User: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Lock: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
}

const navIconMap: Record<NavItemKey, () => JSX.Element> = {
  dashboard: Icons.Home,
  properties: Icons.Building,
  leads: Icons.Users,
  profile: Icons.User,
  verification: Icons.Shield,
  subscription: Icons.CreditCard,
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsProfileDropdownOpen(false)
    }
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

  const navItem = AGENT_NAV_ITEMS.find(n => n.key === accessModal.navKey)
  const accessResult = accessModal.navKey ? checkAgentAccess(agentStatus, accessModal.navKey) : null

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <Link href="/agent/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">MF</span>
                </div>
                <span className="text-lg font-semibold text-gray-900 hidden sm:block">Agent Portal</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {AGENT_NAV_ITEMS.map((item) => {
                const Icon = navIconMap[item.key]
                const isActive = pathname ? (pathname === item.href || pathname.startsWith(item.href + '/')) : false
                const hasAccess = accessMap[item.module]

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={(e) => !hasAccess && handleNavClick(item.key, e)}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : hasAccess
                        ? 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <Icon />
                    {item.label}
                    {!hasAccess && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
              {/* Profile Completion Badge - Desktop */}
              {profileCompletion < 100 && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-full">
                  <div className="w-24 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-amber-700">{profileCompletion}%</span>
                </div>
              )}

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsProfileDropdownOpen(!isProfileDropdownOpen)
                  }}
                  className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center overflow-hidden">
                    {profileImageUrl ? (
                      <img src={profileImageUrl} alt={agentName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-blue-700 font-semibold text-sm">
                        {agentName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[120px]">{agentName}</p>
                    <p className="text-xs text-gray-500">{agentStatus.replace(/_/g, ' ')}</p>
                  </div>
                  <Icons.ChevronDown />
                </button>

                {/* Dropdown Menu */}
                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 overflow-hidden">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{agentName}</p>
                      <p className="text-xs text-gray-500 truncate">{agentEmail}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/agent/profile"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Icons.User />
                        My Profile
                      </Link>
                      <Link
                        href="/agent/verification"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Icons.Shield />
                        Verification Status
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 pt-1">
                      <a
                        href="/api/auth/signout"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? <Icons.Close /> : <Icons.Menu />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white">
            <div className="px-4 py-3 space-y-1">
              {AGENT_NAV_ITEMS.map((item) => {
                const Icon = navIconMap[item.key]
                const isActive = pathname ? (pathname === item.href || pathname.startsWith(item.href + '/')) : false
                const hasAccess = accessMap[item.module]

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={(e) => !hasAccess && handleNavClick(item.key, e)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : hasAccess
                        ? 'text-gray-700 hover:bg-gray-50'
                        : 'text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {!hasAccess && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <Icons.Lock />
                        Locked
                      </span>
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
                  <span className="text-sm font-medium text-amber-700">{profileCompletion}%</span>
                </div>
                <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
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
