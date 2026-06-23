'use client'

import { useState, useEffect, useCallback } from 'react'

const CRM_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'SITE_VISIT', 'NEGOTIATION', 'BOOKED', 'CLOSED', 'LOST']

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  CONTACTED: 'bg-indigo-100 text-indigo-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  SITE_VISIT: 'bg-amber-100 text-amber-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  BOOKED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-600',
}

const LEAD_TYPE_LABELS: Record<string, string> = {
  PROJECT: 'Project Enquiry',
  CONTACT: 'Contact',
  DEVELOPER: 'Developer Enquiry',
  BROCHURE_REQUEST: 'Brochure Request',
  SITE_VISIT_REQUEST: 'Site Visit',
  CALL_BACK: 'Call Back',
  THREE_D_TOUR_REQUEST: '3D Tour',
}

export default function DeveloperLeadsPage() {
  const [leads, setLeads] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [stageFilter, setStageFilter] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [bulkStage, setBulkStage] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const q = stageFilter ? `?stage=${stageFilter}` : ''
    const res = await fetch(`/api/developer/leads${q}`).catch(() => null)
    const data = await res?.json().catch(() => null)
    setLeads(data?.leads || [])
    setTotal(data?.total || 0)
    setLoading(false)
  }, [stageFilter])

  useEffect(() => { load() }, [load])

  const toggleSelect = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const handleBulkUpdate = async () => {
    if (!bulkStage || !selected.length) return
    setUpdating(true)
    await fetch('/api/developer/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selected, crmStage: bulkStage }),
    })
    setSelected([])
    setBulkStage('')
    await load()
    setUpdating(false)
  }

  // Kanban: group by stage
  const byStage = CRM_STAGES.reduce<Record<string, any[]>>((acc, s) => {
    acc[s] = leads.filter(l => (l.crmStage || 'NEW') === s)
    return acc
  }, {})

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads & CRM</h1>
          <p className="text-gray-500 text-sm mt-1">{total} lead{total !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button onClick={() => setView('table')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              Table
            </button>
            <button onClick={() => setView('kanban')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              Kanban
            </button>
          </div>
        </div>
      </div>

      {/* Stage filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        <button onClick={() => setStageFilter('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${!stageFilter ? 'bg-dark-blue text-white border-dark-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
          All
        </button>
        {CRM_STAGES.map(s => (
          <button key={s} onClick={() => setStageFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${stageFilter === s ? 'bg-dark-blue text-white border-dark-blue' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
            {s.replace('_', ' ')} <span className="ml-1 opacity-60">{byStage[s]?.length || 0}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions bar */}
      {selected.length > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium text-blue-700">{selected.length} selected</span>
          <select value={bulkStage} onChange={e => setBulkStage(e.target.value)}
            className="h-8 px-3 border border-blue-200 rounded-lg text-sm bg-white text-gray-700 focus:ring-2 focus:ring-dark-blue">
            <option value="">Move to stage...</option>
            {CRM_STAGES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <button onClick={handleBulkUpdate} disabled={!bulkStage || updating}
            className="px-4 py-1.5 bg-dark-blue text-white rounded-lg text-sm font-medium hover:bg-dark-blue/90 disabled:opacity-50 transition-all">
            {updating ? 'Updating...' : 'Apply'}
          </button>
          <button onClick={() => setSelected([])} className="ml-auto text-xs text-blue-500 hover:underline">Clear</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-dark-blue border-t-transparent rounded-full mx-auto" />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center">
          <svg className="w-12 h-12 text-gray-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 font-medium">No leads yet</p>
          <p className="text-gray-400 text-sm mt-1">Leads will appear here when buyers enquire about your projects.</p>
        </div>
      ) : view === 'table' ? (
        /* Table View */
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="rounded"
                    checked={selected.length === leads.length && leads.length > 0}
                    onChange={e => setSelected(e.target.checked ? leads.map(l => l.id) : [])} />
                </th>
                {['Name', 'Contact', 'Project', 'Type', 'Stage', 'Date'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead: any) => (
                <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${selected.includes(lead.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded" checked={selected.includes(lead.id)} onChange={() => toggleSelect(lead.id)} />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    <div className="text-xs">{lead.email}</div>
                    {lead.phone && <div className="text-xs text-gray-400">{lead.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{lead.project?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{LEAD_TYPE_LABELS[lead.leadType] || lead.leadType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[(lead.crmStage || 'NEW')]}`}>
                      {(lead.crmStage || 'NEW').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{fmt(lead.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {CRM_STAGES.map(stage => (
            <div key={stage} className="flex-shrink-0 w-64">
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[stage]}`}>
                  {stage.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-400 font-medium">{byStage[stage].length}</span>
              </div>
              <div className="space-y-2">
                {byStage[stage].map((lead: any) => (
                  <div key={lead.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow">
                    <p className="font-medium text-sm text-gray-900 mb-1">{lead.name}</p>
                    <p className="text-xs text-gray-400">{lead.email}</p>
                    {lead.project && <p className="text-xs text-dark-blue mt-1 font-medium">{lead.project.name}</p>}
                    <p className="text-xs text-gray-300 mt-2">{fmt(lead.createdAt)}</p>
                  </div>
                ))}
                {byStage[stage].length === 0 && (
                  <div className="rounded-xl border-2 border-dashed border-gray-100 py-8 text-center">
                    <p className="text-xs text-gray-300">Empty</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
