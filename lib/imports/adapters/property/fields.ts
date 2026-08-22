import type { ImportFieldDefinition } from '@/lib/imports/core/types'

export const propertyFieldDefinitions: ImportFieldDefinition[] = [
  { field: 'title', label: 'Title', type: 'string', requiredness: 'required', aliases: ['property_name', 'listing_title', 'name'] },
  { field: 'agentId', label: 'Agent owner', type: 'string', requiredness: 'required', aliases: ['agent_id', 'owner_agent_id'] },
  { field: 'propertyType', label: 'Property type', type: 'enum', requiredness: 'recommended', aliases: ['property_type', 'type'] },
  { field: 'intent', label: 'Intent', type: 'enum', requiredness: 'recommended', aliases: ['listing_type', 'purpose'] },
  { field: 'price', label: 'Price', type: 'number', requiredness: 'recommended', aliases: ['asking_price', 'amount'] },
  { field: 'currency', label: 'Currency', type: 'string', requiredness: 'recommended', aliases: ['price_currency'] },
  { field: 'bedrooms', label: 'Bedrooms', type: 'number', requiredness: 'recommended', aliases: ['bhk', 'beds', 'bedrooms_count'] },
  { field: 'bathrooms', label: 'Bathrooms', type: 'number', requiredness: 'recommended', aliases: ['baths', 'bathrooms_count'] },
  { field: 'squareFeet', label: 'Area', type: 'number', requiredness: 'recommended', aliases: ['square_feet', 'built_up_area', 'area', 'size'] },
  { field: 'countryIso2', label: 'Country', type: 'string', requiredness: 'recommended', aliases: ['country', 'country_code'] },
  { field: 'city', label: 'City', type: 'string', requiredness: 'recommended', aliases: ['location.city', 'city_name'] },
  { field: 'community', label: 'Community', type: 'string', requiredness: 'recommended', aliases: ['locality', 'neighborhood', 'location.community'] },
  { field: 'sourceProvider', label: 'Source provider', type: 'string', requiredness: 'optional', aliases: ['provider', 'source'] },
  { field: 'sourceUrl', label: 'Source URL', type: 'string', requiredness: 'optional', aliases: ['source_url', 'listing_url', 'url'] },
  { field: 'sourceListingId', label: 'Source listing ID', type: 'string', requiredness: 'optional', aliases: ['source_listing_id', 'external_id', 'listing_id'] },
]
