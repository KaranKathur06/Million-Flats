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
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-white via-[#F5F8FF] to-white">
      <div className="lg:hidden relative h-[42vh] min-h-[320px]">
        <Image
          src="/auth-bg.jpg"
          alt="Luxury Real Estate"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/95 via-dark-blue/80 to-black/60" />
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

        <div className="relative z-10 flex flex-col justify-center p-14 text-white">
          <h1 className="text-5xl font-serif font-bold leading-tight tracking-tight">
            Exclusive access begins here.
          </h1>
          <p className="mt-5 text-lg text-white/90 max-w-xl">
            For verified buyers and professional agents.
          </p>
        </div>
      </div>

      {/* Right Section - Auth Card */}
      <div className="w-full lg:w-[40%] flex flex-col bg-gradient-to-br from-white via-[#F5F8FF] to-white">
        <div className="flex items-center justify-between px-6 sm:px-10 py-6">
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

        <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-10 pb-12">
          <div className="w-full max-w-[520px]">
            <div className="rounded-[20px] border border-gray-200 bg-white/90 backdrop-blur-md shadow-[0_30px_70px_rgba(10,25,60,0.18)] p-8 sm:p-10">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue mb-2">{title}</h2>
                {subtitle ? <p className="text-gray-600 mt-2">{subtitle}</p> : null}
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

