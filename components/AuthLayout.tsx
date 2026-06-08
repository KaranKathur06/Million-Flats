import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-gradient-to-br from-white via-[#F5F8FF] to-white">
      <div className="lg:hidden relative h-[28vh] min-h-[220px]">
        <Image
          src="/auth-bg.jpg"
          alt="Luxury Real Estate"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/95 via-dark-blue/80 to-black/55" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
      </div>

      {/* Left Section - Visual/Branding */}
      <div className="hidden lg:flex lg:w-[60%] relative">
        <Image
          src="/auth-bg.jpg"
          alt="Luxury Real Estate"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/95 via-dark-blue/80 to-dark-blue/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_24%,rgba(255,255,255,0.10),transparent_55%)]" />

        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <h1 className="text-[44px] font-serif font-bold leading-tight tracking-tight">
            Exclusive access begins here.
          </h1>
          <p className="mt-4 text-[17px] text-white/90 max-w-xl">
            For verified buyers and professional agents.
          </p>
        </div>
      </div>

      {/* Right Section - Auth Card */}
      <div className="w-full lg:w-[40%] flex flex-col bg-white lg:bg-gradient-to-br lg:from-white lg:via-[#F5F8FF] lg:to-white -mt-10 lg:mt-0 rounded-t-[28px] lg:rounded-none shadow-[0_-18px_45px_rgba(10,25,60,0.10)] lg:shadow-none relative z-10">
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

        <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-8 pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pb-5">
          <div className="w-full max-w-[440px]">
            <div className="rounded-2xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(10,25,60,0.10)] p-6 space-y-4">
              <div>
                <h2 className="text-[clamp(24px,4.6vw,32px)] font-serif font-bold text-dark-blue mb-2">{title}</h2>
                {subtitle ? <p className="text-gray-600 mb-4">{subtitle}</p> : null}
                <p className="text-xs text-gray-500">Secure • Encrypted • Verified Access</p>
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

