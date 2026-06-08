'use client'

import dynamic from 'next/dynamic'
import { useMemo } from 'react'
import type { EcosystemToolKey } from '@/lib/ecosystem/categoryConfig'

const LoanToolsClient = dynamic(() => import('@/app/ecosystem-partners/home-loans-finance/_components/LoanToolsClient'), {
  ssr: false,
})

const ManagementYieldToolClient = dynamic(
  () => import('@/app/ecosystem-partners/property-management/_components/ManagementYieldToolClient'),
  {
    ssr: false,
  }
)

export default function EcosystemToolSection({ tool }: { tool: EcosystemToolKey }) {
  const Comp = useMemo(() => {
    if (tool === 'home-loans') return LoanToolsClient
    if (tool === 'property-management') return ManagementYieldToolClient
    return null
  }, [tool])

  if (!Comp) return null

  return (
    <section className="py-12" id="tools">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-dark-blue">Interactive Tools</h2>
          <p className="mt-2 text-sm text-gray-600">Use quick tools to understand your options before you speak to partners.</p>
        </div>

        <div className="mt-8">
          <Comp />
        </div>
      </div>
    </section>
  )
}
