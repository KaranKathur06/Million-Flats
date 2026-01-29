import { Suspense } from 'react'
import PropertiesClient from '@/app/properties/PropertiesClient'

export const metadata = {
  title: 'Rent - millionflats',
}

export default function RentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PropertiesClient forcedPurpose="rent" />
    </Suspense>
  )
}
