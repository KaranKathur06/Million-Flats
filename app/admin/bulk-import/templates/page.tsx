'use client'

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
      <p className="mt-2 text-sm text-white/50">Download a canonical property JSON template for reviewed imports.</p>
      <button type="button" onClick={download} className="mt-6 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black">Download property template</button>
      <pre className="mt-6 overflow-auto rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 text-xs text-white/60">{JSON.stringify(template, null, 2)}</pre>
    </main>
  )
}
