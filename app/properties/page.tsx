import { Suspense } from 'react'
import PropertiesClient from '@/app/properties/PropertiesClient'

export default function PropertiesPage() {
  return (
    <Suspense fallback={null}>
      <PropertiesClient />
    </Suspense>
  )
}

