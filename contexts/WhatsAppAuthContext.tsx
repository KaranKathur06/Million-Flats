'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

interface WhatsAppAuthContextValue {
  isOpen: boolean
  redirectAfterAuth: string
  openModal: (redirectTo?: string) => void
  closeModal: () => void
}

const WhatsAppAuthContext = createContext<WhatsAppAuthContextValue>({
  isOpen: false,
  redirectAfterAuth: '/dashboard',
  openModal: () => {},
  closeModal: () => {},
})

export function WhatsAppAuthProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [redirectAfterAuth, setRedirectAfterAuth] = useState('/dashboard')

  const openModal = useCallback((redirectTo?: string) => {
    setRedirectAfterAuth(redirectTo || '/dashboard')
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <WhatsAppAuthContext.Provider value={{ isOpen, redirectAfterAuth, openModal, closeModal }}>
      {children}
    </WhatsAppAuthContext.Provider>
  )
}

export function useWhatsAppAuth() {
  return useContext(WhatsAppAuthContext)
}
