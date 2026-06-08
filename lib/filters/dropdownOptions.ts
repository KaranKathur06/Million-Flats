import type { GlobalDropdownOption } from '@/components/ui/GlobalDropdown'

export const COUNTRY_FILTER_OPTIONS: GlobalDropdownOption[] = [
  { value: 'UAE', label: 'UAE' },
  { value: 'INDIA', label: 'India' },
]

export const PROPERTY_TYPE_FILTER_OPTIONS: GlobalDropdownOption[] = [
  { value: '', label: 'All Types' },
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Penthouse', label: 'Penthouse' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Plot', label: 'Plot' },
]

export const PROPERTY_TYPE_COMPACT_OPTIONS: GlobalDropdownOption[] = [
  { value: '', label: 'Property Type' },
  { value: 'Apartment', label: 'Apartment' },
  { value: 'Villa', label: 'Villa' },
  { value: 'Penthouse', label: 'Penthouse' },
  { value: 'Townhouse', label: 'Townhouse' },
  { value: 'Plot', label: 'Plot' },
]

export const BEDROOM_FILTER_OPTIONS: GlobalDropdownOption[] = [
  { value: '', label: 'Any' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5+' },
]

export const BEDROOM_PLUS_FILTER_OPTIONS: GlobalDropdownOption[] = [
  { value: '', label: 'Beds' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '5', label: '5+' },
]

export const BATHROOM_FILTER_OPTIONS: GlobalDropdownOption[] = [
  { value: '', label: 'Any' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4+' },
]

export const BATHROOM_PLUS_FILTER_OPTIONS: GlobalDropdownOption[] = [
  { value: '', label: 'Baths' },
  { value: '1', label: '1+' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
]

export const LISTING_SORT_OPTIONS: GlobalDropdownOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
]

export const LISTING_SORT_COMPACT_OPTIONS: GlobalDropdownOption[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-low', label: 'Price (Low)' },
  { value: 'price-high', label: 'Price (High)' },
  { value: 'newest', label: 'Newest' },
]

export const AGENT_LISTING_SORT_OPTIONS: GlobalDropdownOption[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
]

export const CONTACT_SUBJECT_OPTIONS: GlobalDropdownOption[] = [
  { value: '', label: 'Select a subject' },
  { value: 'general', label: 'General Inquiry' },
  { value: 'property', label: 'Property Inquiry' },
  { value: 'agent', label: 'Agent Registration' },
  { value: 'support', label: 'Support' },
]

export const RATING_FILTER_OPTIONS: GlobalDropdownOption[] = [
  { value: '0', label: 'Any Rating' },
  { value: '3', label: '3+ stars' },
  { value: '4', label: '4+ stars' },
  { value: '4.5', label: '4.5+ stars' },
]

export function priceFilterOptions(
  prices: number[],
  currencyLabel: string,
  emptyLabel = 'Min Price'
): GlobalDropdownOption[] {
  return [
    { value: '', label: emptyLabel },
    ...prices.map((p) => ({
      value: p.toString(),
      label: `${currencyLabel} ${p.toLocaleString()}`,
    })),
  ]
}

export function cityFilterOptions(cities: readonly string[], emptyLabel = 'All Locations'): GlobalDropdownOption[] {
  return [{ value: '', label: emptyLabel }, ...cities.map((city) => ({ value: city, label: city }))]
}
