'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'

type Variant = 'hero' | 'footer'

type Props = {
  variant?: Variant
  className?: string
}

export default function ThreeDTourDemoCTA({ variant = 'hero', className = '' }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()

  const demoPath = (() => {
    const params = new URLSearchParams(searchParams?.toString() || '')
    params.delete('openDemo')
    const qs = params.toString()
    return `/services/3d-tour-demo${qs ? `?${qs}` : ''}`
  })()

  const handleDemoClick = () => {
    if (status === 'loading') return
    if (status !== 'authenticated') {
      router.push(`/auth/login?next=${encodeURIComponent(demoPath)}`)
      return
    }
    router.push(demoPath)
  }

  const heroBtn =
    'group relative inline-flex items-center justify-center h-16 px-10 rounded-2xl bg-gradient-to-r from-dark-blue to-slate-900 text-white font-extrabold text-lg overflow-hidden shadow-[0_10px_40px_rgba(15,23,42,0.3)] hover:shadow-[0_15px_50px_rgba(15,23,42,0.5)] hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto'
  const footerBtn =
    'group flex items-center justify-center h-16 px-12 rounded-2xl bg-gradient-to-r from-dark-blue to-slate-900 text-white font-extrabold text-lg transition-all shadow-lg hover:shadow-[0_15px_40px_rgba(15,23,42,0.4)] hover:-translate-y-1 w-full sm:w-auto relative overflow-hidden'

  return (
    <button type="button" onClick={handleDemoClick} className={`${variant === 'hero' ? heroBtn : footerBtn} ${className}`}>
      {variant === 'hero' ? (
        <>
          <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-black" />
          <span className="relative z-10 flex items-center gap-3">
            Book a Free Demo
            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </span>
        </>
      ) : (
        <>
          <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative z-10">Book a Free Demo</span>
        </>
      )}
    </button>
  )
}
