'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatCountryPrice } from '@/lib/country'
import { buildPropertySlugPath } from '@/lib/seo'

type Listing = {
  id: string
  title: string
  location: string
  priceLabel: string
  status: 'Draft' | 'Active' | 'Sold'
  thumbnailUrl?: string
}

type DraftListing = {
  id: string
  status: string
  title: string
  location: string
  priceLabel: string
  updatedAtLabel: string
  completionPercent: number
}

type Lead = {
  id: string
  propertyTitle: string
  contactMethod: string
  createdAtLabel: string
}

export default function AgentDashboardClient({
  agentName,
  company,
  license,
  approved,
  publicProfileHref,
  stats,
  profileCompletion,
  draftListings,
  listings,
  leads,
}: {
  agentName: string
  company: string
  license: string
  approved: boolean
  publicProfileHref: string
  stats: {
    totalListings: number
    activeListings: number
    views30d: number
    leadsReceived: number
    contactClicks: number
  }
  profileCompletion: { percent: number; missing: Array<{ key: string; label: string; href: string }> }
  draftListings: DraftListing[]
  listings: Listing[]
  leads: Lead[]
}) {
  const [view, setView] = useState<'grid' | 'table'>('grid')

  const initials = useMemo(() => {
    const parts = (agentName || '').trim().split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] || 'A'
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
    return `${first}${last}`.toUpperCase()
  }, [agentName])

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                <span className="text-lg font-semibold text-gray-700">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-accent-orange font-semibold text-sm uppercase tracking-wider">Agent Portal</p>
                <h1 className="mt-2 text-2xl md:text-3xl font-serif font-bold text-dark-blue truncate">
                  {agentName || 'Agent'}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {company || 'MillionFlats Partner'}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      approved
                        ? 'bg-green-50 text-green-800 border-green-200'
                        : 'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {approved ? 'Verified' : 'Verification pending'}
                  </span>
                  {license ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-gray-700 border border-gray-200">
                      License: {license}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href={publicProfileHref}
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
              >
                View Public Profile
              </Link>
              <Link
                href="/agent/profile"
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
              >
                Edit Profile
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-600">Total Listings</p>
            <p className="mt-2 text-2xl font-bold text-dark-blue">{stats.totalListings}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-600">Active Listings</p>
            <p className="mt-2 text-2xl font-bold text-dark-blue">{stats.activeListings}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-600">Views (30 days)</p>
            <p className="mt-2 text-2xl font-bold text-dark-blue">{stats.views30d}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-600">Leads Received</p>
            <p className="mt-2 text-2xl font-bold text-dark-blue">{stats.leadsReceived}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <p className="text-xs text-gray-600">Contact Clicks</p>
            <p className="mt-2 text-2xl font-bold text-dark-blue">{stats.contactClicks}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {draftListings.length > 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-dark-blue">Draft Listings</h2>
                    <p className="mt-1 text-sm text-gray-600">Pick up where you left off and publish faster.</p>
                  </div>
                  <Link
                    href="/properties/new/manual"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90"
                  >
                    New Draft
                  </Link>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {draftListings.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-dark-blue truncate">{d.title}</p>
                          <p className="mt-1 text-sm text-gray-600 truncate">{d.location}</p>
                        </div>
                        <span className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                          {d.status === 'REJECTED' ? 'Rejected' : 'Draft'}
                        </span>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-dark-blue">{d.priceLabel}</p>
                        <p className="text-xs text-gray-500">{d.updatedAtLabel}</p>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs font-semibold text-gray-700">Completion</p>
                          <p className="text-xs font-semibold text-gray-700">{Math.max(0, Math.min(100, Math.round(d.completionPercent)))}%</p>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full bg-accent-yellow"
                            style={{ width: `${Math.max(0, Math.min(100, Math.round(d.completionPercent)))}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-5 flex items-center gap-2">
                        <Link
                          href={`/properties/new/manual?draft=${encodeURIComponent(d.id)}`}
                          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90"
                        >
                          Resume
                        </Link>
                        <Link
                          href={`/properties/new/manual?draft=${encodeURIComponent(d.id)}`}
                          className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl font-serif font-bold text-dark-blue">Listings</h2>
                  <p className="mt-1 text-sm text-gray-600">Manage your published and draft inventory.</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView('grid')}
                    className={`h-10 px-4 rounded-xl border text-sm font-semibold ${
                      view === 'grid'
                        ? 'border-dark-blue text-dark-blue bg-gray-50'
                        : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('table')}
                    className={`h-10 px-4 rounded-xl border text-sm font-semibold ${
                      view === 'table'
                        ? 'border-dark-blue text-dark-blue bg-gray-50'
                        : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                  >
                    Table
                  </button>
                  <Link
                    href="/properties/new"
                    className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-dark-blue text-white text-sm font-semibold hover:bg-dark-blue/90"
                  >
                    Add New
                  </Link>
                </div>
              </div>

              {listings.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
                  <div className="mx-auto h-12 w-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
                    <span className="text-dark-blue font-bold">M</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-dark-blue">Add your first property</h3>
                  <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
                    Start building trust with buyers by publishing a complete, verified listing.
                  </p>
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <Link
                      href="/properties/new"
                      className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
                    >
                      Add your first property
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold hover:bg-gray-50"
                    >
                      Get help
                    </Link>
                  </div>
                </div>
              ) : view === 'grid' ? (
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listings.map((l) => (
                    (() => {
                      const href = buildPropertySlugPath({ id: l.id, title: l.title }) || `/properties/${encodeURIComponent(l.id)}`
                      return (
                        <div key={l.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                          <div className="h-40 bg-gray-100 border-b border-gray-200" />
                          <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-semibold text-dark-blue truncate">{l.title}</p>
                                <p className="mt-1 text-sm text-gray-600 truncate">{l.location}</p>
                              </div>
                              <span className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                                {l.status}
                              </span>
                            </div>
                            <p className="mt-3 text-lg font-bold text-dark-blue">{l.priceLabel}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Link
                                href={href}
                                className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
                              >
                                View
                              </Link>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Unpublish
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  ))}
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left font-semibold px-4 py-3">Listing</th>
                        <th className="text-left font-semibold px-4 py-3">Status</th>
                        <th className="text-left font-semibold px-4 py-3">Price</th>
                        <th className="text-right font-semibold px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map((l) => (
                        <tr key={l.id} className="border-t border-gray-200">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-dark-blue">{l.title}</p>
                            <p className="text-gray-600 text-xs mt-1">{l.location}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
                              {l.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-dark-blue">{l.priceLabel}</td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={buildPropertySlugPath({ id: l.id, title: l.title }) || `/properties/${encodeURIComponent(l.id)}`}
                              className="inline-flex items-center justify-center h-9 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-dark-blue hover:bg-gray-50"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-dark-blue">Leads Snapshot</h2>
                  <p className="mt-1 text-sm text-gray-600">Recent enquiries and contact intent.</p>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue hover:bg-gray-50"
                >
                  Support
                </Link>
              </div>

              {leads.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6">
                  <p className="text-sm text-gray-600">No recent enquiries yet.</p>
                </div>
              ) : (
                <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left font-semibold px-4 py-3">Property</th>
                        <th className="text-left font-semibold px-4 py-3">Method</th>
                        <th className="text-right font-semibold px-4 py-3">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((l) => (
                        <tr key={l.id} className="border-t border-gray-200">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-dark-blue">{l.propertyTitle}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-700">{l.contactMethod}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{l.createdAtLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-serif font-bold text-dark-blue">Quick Actions</h2>
              <div className="mt-4 space-y-3">
                <Link
                  href="/properties/new"
                  className="block w-full h-11 rounded-xl bg-dark-blue text-white font-semibold flex items-center justify-center hover:bg-dark-blue/90"
                >
                  Add New Listing
                </Link>
                <Link
                  href="/agent/profile"
                  className="block w-full h-11 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold flex items-center justify-center hover:bg-gray-50"
                >
                  Edit Profile
                </Link>
                <Link
                  href={publicProfileHref}
                  className="block w-full h-11 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold flex items-center justify-center hover:bg-gray-50"
                >
                  View Public Profile
                </Link>
                <Link
                  href="/contact"
                  className="block w-full h-11 rounded-xl border border-gray-200 bg-white text-dark-blue font-semibold flex items-center justify-center hover:bg-gray-50"
                >
                  Support / Help
                </Link>
              </div>

              <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-semibold text-dark-blue">Profile completion</p>
                  <p className="text-sm font-semibold text-dark-blue">{Math.max(0, Math.min(100, Math.round(profileCompletion.percent)))}%</p>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white border border-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-accent-yellow"
                    style={{ width: `${Math.max(0, Math.min(100, Math.round(profileCompletion.percent)))}%` }}
                  />
                </div>

                {profileCompletion.missing.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {profileCompletion.missing.slice(0, 3).map((m) => (
                      <Link key={m.key} href={m.href} className="block text-sm font-semibold text-dark-blue hover:underline">
                        {m.label}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-gray-600">Your profile is complete.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-serif font-bold text-dark-blue">Next Steps</h2>
              <p className="mt-2 text-sm text-gray-600">
                Improve conversion by completing your profile and publishing verified listings.
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-dark-blue">Complete your Agent Profile</p>
                  <p className="mt-1 text-xs text-gray-600">Add WhatsApp and your license number for trust.</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-dark-blue">Add high-quality photos</p>
                  <p className="mt-1 text-xs text-gray-600">Premium visuals increase lead conversion.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
