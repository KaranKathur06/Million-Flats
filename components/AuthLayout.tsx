import Image from 'next/image'
import React from 'react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="lg:hidden relative h-[40vh] min-h-[280px]">
        <Image
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80"
          alt="Luxury Real Estate"
          fill
          className="object-cover"
          priority
          sizes="100vw"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/90 via-dark-blue/70 to-black/70" />
      </div>

      {/* Left Section - Visual/Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80"
          alt="Luxury Real Estate"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-blue/90 via-dark-blue/80 to-dark-blue/90"></div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm flex items-center justify-center rounded-lg">
                <span className="text-white font-bold text-2xl">M</span>
              </div>
              <span className="text-white font-semibold text-2xl">millionflats</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4">
            Access Premium Properties Worldwide
          </h1>
          <p className="text-lg text-white/90 max-w-md">
            Secure login to explore verified listings and exclusive opportunities across the UAE.
          </p>
        </div>
      </div>

      {/* Right Section - Auth Card */}
      <div className="w-full lg:w-1/2 flex items-start lg:items-center justify-center px-4 sm:px-6 lg:p-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="w-full max-w-md -mt-10 lg:mt-0 pb-10 lg:pb-0">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center space-x-2 mb-8">
            <Image src="/LOGO.jpeg" alt="Millionflats" width={36} height={36} className="rounded-lg" priority />
            <span className="text-dark-blue font-semibold text-xl">millionflats</span>
          </div>

          {/* Auth Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-white/20">
            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-dark-blue mb-2">
                {title}
              </h2>
              {subtitle && (
                <p className="text-gray-600 mt-2">{subtitle}</p>
              )}
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

