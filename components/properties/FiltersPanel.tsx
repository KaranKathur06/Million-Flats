import GlobalDropdown from '@/components/ui/GlobalDropdown'
import { singleDropdownValue } from '@/components/ui/dropdownUtils'

export default function FiltersPanel({
  open,
  visible,
  close,
  forcedPurpose,
  purpose,
  setPurpose,
  draftFilters,
  setDraftFilters,
  minPriceDrawerOptions,
  maxPriceDrawerOptions,
  BEDROOM_PLUS_FILTER_OPTIONS,
  BATHROOM_PLUS_FILTER_OPTIONS,
  PROPERTY_TYPE_FILTER_OPTIONS,
  LISTING_SORT_COMPACT_OPTIONS,
  resetFilters,
  applyDraft,
  openMoreFilters,
  setRef,
}: any) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] md:hidden">
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={close}
      />
      <div
        className={`absolute inset-x-0 bottom-0 bg-white rounded-t-3xl border border-gray-200 transition-transform duration-200 ${
          visible ? 'translate-y-0' : 'translate-y-6'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Property Filters"
        ref={setRef}
      >
        <div className="px-4 pt-4 pb-24 space-y-4 overflow-auto max-h-[75vh]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-dark-blue">Property Filters</h2>
            <button
              type="button"
              onClick={close}
              className="h-10 w-10 rounded-xl border border-gray-200 inline-flex items-center justify-center"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {!forcedPurpose ? (
            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 w-fit">
              <button
                type="button"
                onClick={() => setPurpose('buy')}
                className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
                  purpose === 'buy' ? 'bg-dark-blue text-white' : 'text-dark-blue hover:bg-gray-50'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setPurpose('rent')}
                className={`h-10 px-4 rounded-lg text-sm font-semibold transition-colors ${
                  purpose === 'rent' ? 'bg-dark-blue text-white' : 'text-dark-blue hover:bg-gray-50'
                }`}
              >
                Rent
              </button>
            </div>
          ) : null}

          <GlobalDropdown
            label="Property Type"
            value={draftFilters.type}
            onChange={(v) => setDraftFilters((prev: any) => ({ ...prev, type: singleDropdownValue(v) }))}
            options={PROPERTY_TYPE_FILTER_OPTIONS}
            appearance="admin-light"
          />

          <div className="grid grid-cols-2 gap-3">
            <GlobalDropdown
              label="Min Price"
              value={draftFilters.minPrice}
              onChange={(v) => setDraftFilters((prev: any) => ({ ...prev, minPrice: singleDropdownValue(v) }))}
              options={minPriceDrawerOptions}
              appearance="admin-light"
              dense
            />
            <GlobalDropdown
              label="Max Price"
              value={draftFilters.maxPrice}
              onChange={(v) => setDraftFilters((prev: any) => ({ ...prev, maxPrice: singleDropdownValue(v) }))}
              options={maxPriceDrawerOptions}
              appearance="admin-light"
              dense
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <GlobalDropdown
              label="Beds"
              value={draftFilters.bedrooms}
              onChange={(v) => setDraftFilters((prev: any) => ({ ...prev, bedrooms: singleDropdownValue(v) }))}
              options={[{ value: '', label: 'Any' }, ...BEDROOM_PLUS_FILTER_OPTIONS.filter((o: any) => o.value !== '')]}
              appearance="admin-light"
              dense
            />
            <GlobalDropdown
              label="Baths"
              value={draftFilters.bathrooms}
              onChange={(v) => setDraftFilters((prev: any) => ({ ...prev, bathrooms: singleDropdownValue(v) }))}
              options={[{ value: '', label: 'Any' }, ...BATHROOM_PLUS_FILTER_OPTIONS.filter((o: any) => o.value !== '')]}
              appearance="admin-light"
              dense
            />
          </div>

          <GlobalDropdown
            label="Sort By"
            value={draftFilters.sortBy}
            onChange={(v) => setDraftFilters((prev: any) => ({ ...prev, sortBy: singleDropdownValue(v) }))}
            options={LISTING_SORT_COMPACT_OPTIONS}
            appearance="admin-light"
          />

          <button
            type="button"
            onClick={() => {
              close()
              openMoreFilters()
            }}
            className="h-12 w-full rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
          >
            More Filters
          </button>
        </div>

        <div className="fixed left-0 right-0 bottom-0 p-4 bg-white border-t border-gray-200">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={resetFilters}
              className="h-12 w-full rounded-xl border border-gray-200 bg-white text-sm font-semibold text-dark-blue"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                close()
                applyDraft()
              }}
              className="h-12 w-full rounded-xl bg-dark-blue text-white text-sm font-semibold"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
