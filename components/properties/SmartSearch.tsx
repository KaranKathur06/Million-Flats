import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { singleDropdownValue } from '@/components/ui/dropdownUtils'
import { COUNTRY_FILTER_OPTIONS } from '@/lib/filters/dropdownOptions'
import { isCountryCode } from '@/lib/country'

export default function SmartSearch({
  draftFilters,
  setDraftFilters,
  onSearch,
}: any) {
  return (
    <div className="flex items-center gap-3">
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

      <div className="flex-1">
        <input
          value={draftFilters.search}
          onChange={(e) => setDraftFilters((prev: any) => ({ ...prev, search: e.target.value }))}
          placeholder="Search properties, city, community..."
          className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-white focus:outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="h-12 px-4 rounded-xl bg-dark-blue text-white font-semibold hover:bg-dark-blue/90"
      >
        Search
      </button>
    </div>
  )
}
