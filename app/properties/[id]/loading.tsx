export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="mt-6 h-[280px] sm:h-[360px] md:h-[600px] bg-gray-200 rounded-2xl animate-pulse" />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="h-10 w-2/3 bg-gray-200 rounded animate-pulse" />
              <div className="mt-3 h-6 w-1/2 bg-gray-200 rounded animate-pulse" />
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 border border-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>

            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="mt-4 h-24 bg-gray-100 border border-gray-200 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="h-10 w-1/2 bg-gray-200 rounded animate-pulse" />
                <div className="mt-3 h-5 w-2/3 bg-gray-200 rounded animate-pulse" />
                <div className="mt-6 grid grid-cols-1 gap-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-100 border border-gray-200 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
