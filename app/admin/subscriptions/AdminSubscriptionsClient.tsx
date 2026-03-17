'use client'

import React, { useState, useEffect } from 'react'

type Subscription = {
  id: string
  agentId: string
  plan: 'BASIC' | 'PROFESSIONAL' | 'PREMIUM'
  status: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  startDate: string
  endDate: string | null
  agent: {
    id: string
    status: string
    user: { name: string; email: string }
  }
}

export default function AdminSubscriptionsClient() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState<string | null>(null)
  
  // Edit Form State
  const [editPlan, setEditPlan] = useState<'BASIC' | 'PROFESSIONAL' | 'PREMIUM'>('BASIC')
  const [editDays, setEditDays] = useState(30)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetchSubs()
  }, [])

  const fetchSubs = async () => {
    try {
      const res = await fetch('/api/admin/subscriptions')
      if (res.ok) {
        const data = await res.json()
        setSubs(data.subscriptions || [])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEditOpen = (sub: Subscription) => {
    setIsEditing(sub.agentId)
    setEditPlan(sub.plan)
    setEditDays(30) // Default extension
  }

  const handleSave = async () => {
    if (!isEditing) return
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: isEditing,
          plan: editPlan,
          extensionDays: editDays,
        }),
      })

      if (res.ok) {
        setIsEditing(null)
        await fetchSubs()
      } else {
        alert('Failed to update subscription')
      }
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) return <div className="p-8"><div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-8"></div></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Subscriptions</h1>
        <p className="text-gray-500 text-sm mt-1">Manage broker subscription plans and limits.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subs.map((sub) => (
              <tr key={sub.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{sub.agent.user.name || 'Unnamed'}</div>
                  <div className="text-sm text-gray-500">{sub.agent.user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    sub.plan === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
                    sub.plan === 'PROFESSIONAL' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {sub.plan}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    sub.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    sub.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {sub.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleEditOpen(sub)}
                    className="text-indigo-600 hover:text-indigo-900 font-semibold"
                  >
                    Edit & Extend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal Overlay */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Subscription</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Tier</label>
                <select 
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as any)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 focus:border-dark-blue focus:ring-1 focus:ring-dark-blue"
                >
                  <option value="BASIC">Basic</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="PREMIUM">Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extend By (Days)</label>
                <input 
                  type="number"
                  value={editDays}
                  onChange={(e) => setEditDays(parseInt(e.target.value) || 0)}
                  className="w-full rounded-xl border border-gray-300 p-2.5 focus:border-dark-blue focus:ring-1 focus:ring-dark-blue"
                  min="1"
                  max="365"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsEditing(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-dark-blue rounded-xl hover:bg-dark-blue/90 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
