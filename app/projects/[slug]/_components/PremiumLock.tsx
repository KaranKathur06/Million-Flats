'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function PremiumLock() {
    const router = useRouter()
    const pathname = usePathname()
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        setIsClient(true)
    }, [])

    const handleUnlock = () => {
        if (!isClient) return
        
        // Save scroll position
        sessionStorage.setItem(`scroll_${pathname}`, window.scrollY.toString())
        
        // Redirect to login with redirect path
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname || '')}`)
    }

    return (
        <div className="relative mt-12 mb-20 overflow-hidden rounded-3xl border border-gray-200 bg-white/60 backdrop-blur-xl shadow-2xl p-8 sm:p-12 text-center">
            {/* Glassmorphism Background effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <div>
                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Unlock the Complete Project Experience</h3>
                    <p className="mt-4 text-lg text-gray-600">
                        Continue to gain exclusive access to premium property insights and investment data.
                    </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-left max-w-xl mx-auto mt-8">
                    {[
                        'Full Gallery & 3D Tour',
                        'AI Verix Analysis',
                        'Investment Score',
                        'Developer Details',
                        'Master Plan',
                        'Brochure Download',
                        'Construction Updates',
                        'Price Insights',
                        'Floor Availability'
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                            <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {feature}
                        </div>
                    ))}
                </div>

                <div className="pt-8">
                    <button
                        onClick={handleUnlock}
                        className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-[#25D366]/30 text-lg gap-3"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                        Continue with WhatsApp
                    </button>
                    <p className="mt-4 text-xs text-gray-500 font-medium">Takes less than 30 seconds. No passwords required.</p>
                </div>
            </div>
        </div>
    )
}
