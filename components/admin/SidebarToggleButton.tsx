'use client'

type Props = {
  collapsed: boolean
  onClick: () => void
  className?: string
  /** collapse = desktop sidebar; menu = mobile drawer */
  variant?: 'collapse' | 'menu'
}

export default function SidebarToggleButton({
  collapsed,
  onClick,
  className = '',
  variant = 'collapse',
}: Props) {
  const isMenu = variant === 'menu'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mf-admin-sidebar-toggle inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-white/70 shadow-sm transition-all duration-300 ease-out hover:border-amber-400/25 hover:bg-amber-400/[0.15] hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${className}`}
      aria-label={isMenu ? 'Open navigation menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={isMenu ? undefined : !collapsed}
      title={isMenu ? 'Open menu' : collapsed ? 'Expand menu' : 'Collapse menu'}
    >
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        {isMenu || collapsed ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
        )}
      </svg>
    </button>
  )
}
