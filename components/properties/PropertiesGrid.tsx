import PropertyListCard from '@/components/PropertyListCard'

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
      <div className="text-center py-12">
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading properties...</p>
      </div>
    )
  }

  if (properties.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className={`grid gap-6 ${variant === 'list' ? 'lg:grid-cols-1' : 'lg:grid-cols-3'}`}>
      {properties.map((property) => (
        <PropertyListCard key={property.id} property={property} variant={variant} />
      ))}
    </div>
  )
}
