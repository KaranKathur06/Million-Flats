import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/adminAuth'
import AdminLayout from '@/components/admin/layout'
import ProjectListingManagementClient from './client'

export const metadata = {
  title: 'Project Listing Management | Admin',
  description: 'Manage project listing order and priorities',
}

async function getMarketConfig() {
  try {
    // Fetch from our own API route
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/admin/projects/market-config`, {
      cache: 'no-store',
      headers: {
        // Note: In a real scenario, you'd pass the user's auth token here
        // For now, we rely on server-side rendering and the client component's auth
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch config: ${response.status}`)
    }

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch config')
    }

    return data.result
  } catch (error: any) {
    console.error('[/admin/projects/listing-management]', error)
    return null
  }
}

export default async function ProjectListingManagementPage() {
  // Verify admin session server-side
  const auth = await requireAdminSession()
  if (!auth.ok) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/60">{auth.message}</p>
        </div>
      </div>
    )
  }

  if (!['ADMIN', 'SUPERADMIN'].includes(auth.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Forbidden</h1>
          <p className="text-white/60">You do not have permission to access this page</p>
        </div>
      </div>
    )
  }

  // Fetch configuration
  const config = await getMarketConfig()

  if (!config) {
    return (
      <AdminLayout title="Project Listing Management">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-white mb-2">Failed to load configuration</h2>
            <p className="text-white/60">Please refresh the page or contact support</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Project Listing Management">
      <ProjectListingManagementClient
        markets={config.markets}
        cities={config.cities}
      />
    </AdminLayout>
  )
}
