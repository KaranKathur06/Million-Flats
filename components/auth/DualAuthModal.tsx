'use client'

/**
 * DualAuthModal.tsx
 *
 * Shown when AuthSettings.activeMode === 'EMAIL_AND_WHATSAPP'.
 * Presents a chooser popup:
 *   - "Continue with WhatsApp" (green, primary)
 *   - OR divider
 *   - "Continue with Email" (blue, secondary)
 *
 * Selecting WhatsApp opens WhatsAppLoginModal.
 * Selecting Email navigates to /auth/login.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WhatsAppLoginModal from '@/components/auth/WhatsAppLoginModal'

interface DualAuthModalProps {
  open: boolean
  onClose: () => void
}

export default function DualAuthModal({ open, onClose }: DualAuthModalProps) {
  const router = useRouter()
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  if (!open && !showWhatsApp) return null

  // If user chose WhatsApp, delegate to WhatsAppLoginModal
  if (showWhatsApp) {
    return (
      <WhatsAppLoginModal
        open
        onClose={() => { setShowWhatsApp(false); onClose() }}
      />
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Choose login method"
      >
        <div
          className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]"
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="p-6 pt-8 space-y-5">
            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Welcome to MillionFlats</h2>
              <p className="text-sm text-gray-500 mt-1">Choose how you'd like to sign in</p>
            </div>

            {/* WhatsApp option */}
            <button
              type="button"
              onClick={() => setShowWhatsApp(true)}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-[#25D366] text-white font-semibold rounded-xl hover:bg-[#20BD5A] transition-all shadow-sm shadow-[#25D366]/20"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Continue with WhatsApp
            </button>

            {/* OR Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Email option */}
            <button
              type="button"
              onClick={() => { onClose(); router.push('/auth/login') }}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Continue with Email
            </button>

            <p className="text-xs text-center text-gray-400">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  )
}
