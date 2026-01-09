'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function AgentDashboardPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    try {
      // This would fetch from API in real implementation
      setListings([])
    } catch (error) {
      console.error('Error fetching listings:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-serif font-bold text-dark-blue mb-2">Agent Dashboard</h1>
            <p className="text-gray-600">Manage your listings and properties</p>
          </div>
          <Link
            href="/properties/new"
            className="bg-dark-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
          >
            Add New Listing
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-dark-blue mb-4">My Listings</h2>
              {loading ? (
                <p className="text-gray-600">Loading...</p>
              ) : listings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">You haven&apos;t created any listings yet.</p>
                  <Link
                    href="/properties/new"
                    className="inline-block bg-dark-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors"
                  >
                    Create Your First Listing
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {listings.map((listing: any) => (
                    <div key={listing.id} className="border-b border-gray-200 pb-4">
                      <Link href={`/properties/${listing.id}`} className="hover:underline">
                        <h3 className="font-semibold text-dark-blue">{listing.title}</h3>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-dark-blue mb-4">Quick Stats</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 text-sm">Total Listings</p>
                  <p className="text-2xl font-bold text-dark-blue">{listings.length}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Active Listings</p>
                  <p className="text-2xl font-bold text-dark-blue">
                    {listings.filter((l: any) => l.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-dark-blue mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link
                  href="/properties/new"
                  className="block w-full bg-dark-blue text-white py-2 px-4 rounded-lg text-center font-medium hover:bg-opacity-90 transition-colors"
                >
                  Add New Listing
                </Link>
                <Link
                  href="/contact"
                  className="block w-full bg-transparent border-2 border-dark-blue text-dark-blue py-2 px-4 rounded-lg text-center font-medium hover:bg-dark-blue hover:text-white transition-colors"
                >
                  Support
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

