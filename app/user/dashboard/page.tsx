'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function UserDashboardPage() {
  const [savedProperties, setSavedProperties] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch saved properties
    fetchSavedProperties()
  }, [])

  const fetchSavedProperties = async () => {
    try {
      // This would fetch from API in real implementation
      setSavedProperties([])
    } catch (error) {
      console.error('Error fetching saved properties:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-dark-blue mb-2">My Dashboard</h1>
          <p className="text-gray-600">Manage your saved properties and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-dark-blue mb-4">Saved Favorites</h2>
              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : savedProperties.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">You haven&apos;t saved any properties yet.</p>
                  <Link
                    href="/properties"
                    className="inline-block bg-dark-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                  >
                    Browse Properties
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedProperties.map((property: any) => (
                    <div key={property.id} className="border-b border-gray-200 pb-4">
                      <Link href={`/properties/${property.id}`} className="hover:underline">
                        <h3 className="font-semibold text-dark-blue">{property.title}</h3>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-dark-blue mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/properties"
                  className="block w-full bg-dark-blue text-white py-2 px-4 rounded-lg text-center font-medium hover:bg-opacity-90 transition-colors"
                >
                  Browse Properties
                </Link>
                <Link
                  href="/contact"
                  className="block w-full bg-transparent border-2 border-dark-blue text-dark-blue py-2 px-4 rounded-lg text-center font-medium hover:bg-dark-blue hover:text-white transition-colors"
                >
                  Contact Agent
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

