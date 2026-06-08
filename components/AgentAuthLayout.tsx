import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

export default function AgentAuthLayout({
  children,
  title,
  subtitle,
  allowScroll,
}: {
  children: React.ReactNode
  title: string
  subtitle?: string
  allowScroll?: boolean
}) {
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-gradient-to-br from-white via-[#F5F8FF] to-white">
      <div className="lg:hidden relative h-[24vh] min-h-[200px]">
        <Image src="/HOMEPAGE.jpg" alt="MillionFlats Agent" fill className="object-cover" priority sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/95 via-dark-blue/80 to-black/55" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
      </div>

      <div
        className={`w-full lg:w-[520px] flex flex-col bg-white lg:bg-gradient-to-br lg:from-white lg:via-[#F5F8FF] lg:to-white -mt-10 lg:mt-0 rounded-t-[28px] lg:rounded-none shadow-[0_-18px_45px_rgba(10,25,60,0.10)] lg:shadow-none relative z-10 ${
          allowScroll ? 'lg:overflow-hidden' : ''
        }`}
      >
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 lg:py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="relative w-8 h-8">
              <Image src="/FAVICON.jpeg" alt="MillionFlats" fill className="object-contain" sizes="32px" priority />
            </span>
            <span className="text-dark-blue font-semibold tracking-wide">millionflats</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-600 hover:text-dark-blue transition-colors">
            Back to Home
          </Link>
        </div>

        <div
          className={`flex-1 px-4 sm:px-8 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pb-6 ${
            allowScroll ? 'lg:overflow-y-auto' : 'flex items-start lg:items-center justify-center'
          }`}
        >
          <div className={`${allowScroll ? 'mx-auto' : ''} w-full max-w-[460px] ${allowScroll ? 'pt-1' : ''}`}
          >
            <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(10,25,60,0.10)] p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-accent-orange">Agent Onboarding</p>
                <h2 className="mt-2 text-[clamp(24px,4.6vw,32px)] font-serif font-bold text-dark-blue mb-2">{title}</h2>
                {subtitle ? <p className="text-gray-600 mb-4">{subtitle}</p> : null}
                <p className="text-xs text-gray-500">Secure • Encrypted • Verified Access</p>
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 relative">
        <Image src="/HOMEPAGE.jpg" alt="MillionFlats Agent" fill className="object-cover" priority sizes="(min-width: 1024px) calc(100vw - 520px), 100vw" />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/95 via-dark-blue/80 to-dark-blue/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(255,255,255,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <h1 className="text-[44px] font-serif font-bold leading-tight tracking-tight">Agent partnership starts here.</h1>
          <p className="mt-4 text-[17px] text-white/90 max-w-xl">
            Verified profiles get priority placement and access to qualified leads.
          </p>
        </div>
      </div>
    </div>
  )
}
