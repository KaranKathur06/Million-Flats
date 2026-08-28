import { getCategorySchema } from '@/lib/ecosystem/admin/categoryFieldRegistry'

type Props = {
  categorySlug: string
  data: Record<string, unknown>
}

export default function PartnerCategoryDetails({ categorySlug, data }: Props) {
  const schema = getCategorySchema(categorySlug)
  if (!schema || !data || Object.keys(data).length === 0) return null

  // Only show fields that have values
  const filledFields = schema.fields.filter((field) => {
    const value = data[field.name]
    if (value == null) return false
    if (typeof value === 'string' && !value.trim()) return false
    if (Array.isArray(value) && value.length === 0) return false
    return true
  })

  if (filledFields.length === 0) return null

  return (
    <section className="py-12">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-dark-blue sm:text-3xl">
          {schema.label} Details
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {filledFields.map((field) => {
            const value = data[field.name]

            return (
              <div
                key={field.name}
                className={`rounded-xl border border-gray-200 bg-white p-5 ${
                  field.colSpan === 2 ? 'sm:col-span-2' : ''
                }`}
              >
                <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {field.label}
                </dt>
                <dd className="mt-2">
                  {Array.isArray(value) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {(value as string[]).map((item) => (
                        <span
                          key={item}
                          className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed text-gray-800 whitespace-pre-line">
                      {String(value)}
                    </p>
                  )}
                </dd>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
