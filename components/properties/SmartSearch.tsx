import { useEffect, useRef, useState } from 'react'
import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { singleDropdownValue } from '@/components/ui/dropdownUtils'
import { COUNTRY_FILTER_OPTIONS } from '@/lib/filters/dropdownOptions'
import { isCountryCode } from '@/lib/country'

export default function SmartSearch({
  draftFilters,
  setDraftFilters,
  onSearch,
  purpose = 'buy',
}: any) {
  const timerRef = useRef<number | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    requestRef.current?.abort()
  }, [])

  useEffect(() => {
    const query = String(draftFilters.search || '').trim()
    if (!query) {
      setSuggestions([])
      setActiveIndex(-1)
      requestRef.current?.abort()
      return
    }

    const controller = new AbortController()
    requestRef.current?.abort()
    requestRef.current = controller
    setSuggestionsLoading(true)
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, purpose, limit: '6' })
        const response = await fetch(`/api/properties?${params.toString()}`, { signal: controller.signal })
        const json = await response.json()
        if (!controller.signal.aborted) setSuggestions(Array.isArray(json?.items) ? json.items : [])
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false)
      }
    }, 200)
    return () => window.clearTimeout(timer)
  }, [draftFilters.search, purpose])

  const updateSearch = (search: string) => {
    const next = { ...draftFilters, search }
    setDraftFilters(next)
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => onSearch(next), 200)
  }

  return (
    <div className="relative flex items-center gap-3">
      <GlobalDropdown
        label="Country"
        showLabel={false}
        value={draftFilters.country}
        onChange={(v) => {
          const next = singleDropdownValue(v)
          if (!isCountryCode(next)) return
          setDraftFilters((prev: any) => ({ ...prev, country: next }))
        }}
        options={COUNTRY_FILTER_OPTIONS}
        appearance="admin-light"
        dense
        className="w-[150px]"
      />

      <div className="relative flex-1">
        <input
          value={draftFilters.search}
          onChange={(e) => updateSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setSuggestions([])
              e.currentTarget.blur()
            }
            if (e.key === 'ArrowDown' && suggestions.length) {
              e.preventDefault()
              setActiveIndex((current) => (current + 1) % suggestions.length)
            }
            if (e.key === 'ArrowUp' && suggestions.length) {
              e.preventDefault()
              setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length)
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              const selected = suggestions[activeIndex]
              if (selected) updateSearch(selected.title || selected.city || '')
              else onSearch(draftFilters)
              setSuggestions([])
            }
          }}
          onFocus={() => {
            if (draftFilters.search) setActiveIndex(-1)
          }}
          aria-label="Search properties"
          placeholder="Search properties, projects, localities..."
          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-dark-blue/30"
        />
        {(suggestionsLoading || suggestions.length > 0 || (draftFilters.search && !suggestionsLoading)) ? (
          <div className="absolute left-0 right-0 top-full z-[80] mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl" role="listbox" aria-label="Property search results">
            {suggestionsLoading ? <p className="px-4 py-3 text-sm text-gray-500">Searching properties...</p> : null}
            {!suggestionsLoading && suggestions.length === 0 ? <p className="px-4 py-3 text-sm text-gray-500">No matching properties or locations found.</p> : null}
            {!suggestionsLoading && suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  updateSearch(suggestion.title || suggestion.city || '')
                  setSuggestions([])
                }}
                className={`block w-full px-4 py-3 text-left ${index === activeIndex ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
              >
                <span className="block truncate text-sm font-semibold text-dark-blue">{suggestion.title || 'Property'}</span>
                <span className="mt-1 block truncate text-xs text-gray-500">{[suggestion.community, suggestion.city, suggestion.country].filter(Boolean).join(' · ')}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
