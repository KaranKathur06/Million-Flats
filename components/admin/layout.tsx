'use client'

import React from 'react'

type AdminLayoutProps = {
  title?: string
  children: React.ReactNode
}

export function AdminLayout({ title, children }: AdminLayoutProps) {
  return (
    <div className="space-y-6">
      {title ? <h1 className="text-2xl font-semibold">{title}</h1> : null}
      {children}
    </div>
  )
}

export default AdminLayout
