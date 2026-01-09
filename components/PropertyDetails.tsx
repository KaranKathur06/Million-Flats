interface Property {
  id: string
  title: string
  location: string
  price: number
  bedrooms: number
  bathrooms: number
  squareFeet: number
  description: string
  yearBuilt?: number
  propertyType: string
  features: string[]
}

export default function PropertyDetails({ property }: { property: Property }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-serif font-bold text-dark-blue mb-2">{property.title}</h1>
        <p className="text-xl text-gray-600">{property.location}</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8 pb-8 border-b border-gray-200">
        <div>
          <p className="text-gray-600 text-sm mb-1">Bedrooms</p>
          <p className="text-2xl font-semibold text-dark-blue">{property.bedrooms}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm mb-1">Bathrooms</p>
          <p className="text-2xl font-semibold text-dark-blue">{property.bathrooms}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm mb-1">Square Feet</p>
          <p className="text-2xl font-semibold text-dark-blue">{property.squareFeet.toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Description</h2>
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{property.description}</p>
      </div>

      {property.features && property.features.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {property.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-accent-yellow" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {property.yearBuilt && (
        <div>
          <h2 className="text-2xl font-serif font-bold text-dark-blue mb-4">Property Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Property Type</p>
              <p className="text-lg font-semibold text-dark-blue">{property.propertyType}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Year Built</p>
              <p className="text-lg font-semibold text-dark-blue">{property.yearBuilt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

