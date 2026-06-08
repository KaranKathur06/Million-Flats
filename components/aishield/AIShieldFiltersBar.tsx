'use client'

import { useState } from 'react'
import PremiumDropdown from '@/components/PremiumDropdown'

interface AIShieldFiltersBarProps {
  search: string
  onSearchChange: (v: string) => void
  city: string
  onCityChange: (v: string) => void
  developer: string
  onDeveloperChange: (v: string) => void
  country: string
  onCountryChange: (v: string) => void
  aiStatus: string
  onAiStatusChange: (v: string) => void
  propertyType: string
  onPropertyTypeChange: (v: string) => void
  completion: string
  onCompletionChange: (v: string) => void
  goldenVisa: string
  onGoldenVisaChange: (v: string) => void
  cityOptions: string[]
  developerOptions: string[]
  countryOptions: { iso: string; label: string }[]
  activeFiltersCount: number
  onClear: () => void
}

const AI_STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'great-deal', label: 'Great Deal' },
  { value: 'fair-value', label: 'Fair Value' },
  { value: 'overpriced', label: 'Overpriced' },
  { value: 'high-risk', label: 'High Risk' },
]

const PROPERTY_TYPES = ['', 'Apartment', 'Villa', 'Townhouse', 'Commercial']
const COMPLETION_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'off-plan', label: 'Off-Plan' },
  { value: 'ready', label: 'Ready' },
]

export function AIShieldFiltersBar(props: AIShieldFiltersBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  return (
    <section className="bg-white border-b border-gray-200">
      <div className="container mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <input
              type="search"
              value={props.search}
              onChange={(e) => props.onSearchChange(e.target.value)}
              placeholder="Search projects, developers, areas…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PremiumDropdown
              value={props.city}
              onChange={props.onCityChange}
              variant="light"
              options={[{ value: '', label: 'City' }, ...props.cityOptions.map((c) => ({ value: c, label: c }))]}
            />
            <PremiumDropdown
              value={props.developer}
              onChange={props.onDeveloperChange}
              variant="light"
              options={[{ value: '', label: 'Developer' }, ...props.developerOptions.map((d) => ({ value: d, label: d }))]}
            />
            <PremiumDropdown
              value={props.aiStatus}
              onChange={props.onAiStatusChange}
              variant="light"
              options={AI_STATUS_OPTIONS}
            />
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {advancedOpen ? 'Less filters' : 'More filters'}
              {props.activeFiltersCount > 0 && !advancedOpen && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">
                  {props.activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {advancedOpen && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            <PremiumDropdown
              value={props.country}
              onChange={props.onCountryChange}
              variant="light"
              options={[
                { value: '', label: 'Country' },
                ...props.countryOptions.map((c) => ({ value: c.label.toLowerCase(), label: c.label })),
              ]}
            />
            <PremiumDropdown
              value={props.propertyType}
              onChange={props.onPropertyTypeChange}
              variant="light"
              options={PROPERTY_TYPES.map((t) => ({ value: t, label: t || 'Type' }))}
            />
            <PremiumDropdown
              value={props.completion}
              onChange={props.onCompletionChange}
              variant="light"
              options={COMPLETION_OPTIONS}
            />
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-xs cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={props.goldenVisa === 'true'}
                onChange={(e) => props.onGoldenVisaChange(e.target.checked ? 'true' : '')}
                className="rounded"
              />
              Golden Visa
            </label>
            {props.activeFiltersCount > 0 && (
              <button type="button" onClick={props.onClear} className="text-xs font-semibold text-red-600 px-2">
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
