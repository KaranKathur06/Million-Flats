export default function PartnerDirectoryPlaceholder({
  filters,
}: {
  filters: { label: string; options: string[] }[]
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Partner Directory</h3>
        <p className="text-sm text-gray-600">
          Coming next: a filterable directory of verified partners for this category.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {filters.map((f) => (
          <div key={f.label} className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900">{f.label}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {f.options.slice(0, 6).map((o) => (
                <span
                  key={o}
                  className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700"
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-2xl border border-gray-200 p-4">
            <div className="h-10 w-32 rounded bg-gray-100" />
            <div className="mt-3 h-4 w-3/4 rounded bg-gray-100" />
            <div className="mt-2 h-3 w-full rounded bg-gray-100" />
            <div className="mt-2 h-3 w-5/6 rounded bg-gray-100" />
            <div className="mt-4 h-10 w-full rounded-xl bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
