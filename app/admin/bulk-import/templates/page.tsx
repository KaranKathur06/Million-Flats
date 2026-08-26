'use client'

import { useEffect, useState } from 'react'

const template = {
  schemaVersion: 'property-import-v1',
  agentId: 'existing-agent-id',
  properties: [
    {
      title: 'Example property',
      propertyType: 'Apartment',
      intent: 'SALE',
      price: 15000000,
      currency: 'INR',
      bedrooms: 3,
      bathrooms: 2,
      squareFeet: 1200,
      countryIso2: 'IN',
      city: 'Mumbai',
      community: 'Bandra',
      sourceProvider: 'EXAMPLE_PORTAL',
      sourceListingId: 'example-001',
      sourceUrl: 'https://example.com/listing/example-001'
    }
  ]
}

export default function ImportTemplatesPage() {
  const [templates, setTemplates] = useState<Array<{ entityType: string; displayName: string; fields: Array<{ field: string; label: string; requiredness: string }> }>>([])

  useEffect(() => {
    fetch('/api/admin/bulk-import/templates', { cache: 'no-store' })
      .then((response) => response.json())
      .then((payload) => { if (Array.isArray(payload.templates)) setTemplates(payload.templates) })
      .catch(() => undefined)
  }, [])

  const download = () => {
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'millionflats-property-import-template.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="mx-auto max-w-4xl p-6 lg:p-8 text-white">
      <h1 className="text-2xl font-semibold">Import templates</h1>
      <p className="mt-2 text-sm text-white/50">Download registry-backed field templates for reviewed imports.</p>
      <button type="button" onClick={download} className="mt-6 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black">Download property template</button>
      {templates.length > 0 && <div className="mt-8 grid gap-3 sm:grid-cols-2">{templates.map((item) => <article key={item.entityType} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"><h2 className="font-semibold">{item.displayName}</h2><p className="mt-2 text-xs text-white/45">{item.fields.length} canonical fields · {item.fields.filter((field) => field.requiredness === 'required').length} required</p><div className="mt-3 flex flex-wrap gap-1.5">{item.fields.slice(0, 8).map((field) => <span key={field.field} className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/50">{field.label}</span>)}</div></article>)}</div>}
      <pre className="mt-6 overflow-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-xs text-white/60">{JSON.stringify(template, null, 2)}</pre>
    </main>
  )
}
