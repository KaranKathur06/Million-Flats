import PropertyDiscoveryCard from '@/components/properties/PropertyDiscoveryCard'

type Property = any

type PropertyCardVariant = 'grid' | 'list' | 'compact'

interface PropertiesGridProps {
  properties: Property[]
  loading: boolean
  error: string
  emptyLabel?: string
  variant?: PropertyCardVariant
}

export default function PropertiesGrid({
  properties,
  loading,
  error,
  emptyLabel = 'No properties found matching your criteria.',
  variant = 'grid',
}: PropertiesGridProps) {
  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-6 py-12 text-center">
        <p className="text-gray-700">We couldn&apos;t load properties right now.</p>
        <p className="mt-2 text-sm text-gray-600">{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white animate-pulse">
            <div className="aspect-[16/10] bg-gray-100" />
            <div className="space-y-3 p-5">
              <div className="h-6 w-2/5 rounded bg-gray-100" />
              <div className="h-5 w-4/5 rounded bg-gray-100" />
              <div className="h-4 w-3/5 rounded bg-gray-100" />
              <div className="h-4 w-4/5 rounded bg-gray-100" />
              <div className="h-10 rounded-xl bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
        <p className="text-lg font-semibold text-dark-blue">No properties match your search</p>
        <p className="mt-2 text-sm text-gray-600">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${variant === 'list' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
      {properties.map((property) => (
        <PropertyDiscoveryCard key={property.id} property={property} />
      ))}
    </div>
  )
}
