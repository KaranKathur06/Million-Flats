import { getCategorySchema } from '@/lib/ecosystem/admin/categoryFieldRegistry'

type Props = {
  categorySlug: string
  data: Record<string, unknown>
}

function hasValue(value: unknown) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string' || typeof item === 'number')
      .map(String)
  }
  if (typeof value === 'boolean') return [value ? 'Yes' : 'No']
  if (typeof value === 'string' || typeof value === 'number') return [String(value)]
  return []
}

export default function PartnerCategoryDetails({ categorySlug, data }: Props) {
  const schema = getCategorySchema(categorySlug)
  if (!schema || !data || Object.keys(data).length === 0) return null

  const fields = schema.fields.filter(
    (field) =>
      field.type !== 'email' &&
      field.type !== 'tel' &&
      hasValue(data[field.name])
  )

  if (fields.length === 0) return null

  const groups = schema.sections
    .map((section) => ({
      section,
      fields: fields.filter((field) => field.section === section.key),
    }))
    .filter((group) => group.fields.length > 0)

  const ungroupedFields = fields.filter(
    (field) => !schema.sections.some((section) => section.key === field.section)
  )

  return (
    <section id="partner-details" className="scroll-mt-28 py-7">
      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a6b00]">
          Category profile
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[#1e3a5f] sm:text-2xl">
          {schema.label}
        </h2>
      </div>

      <div className="space-y-4">
        {groups.map(({ section, fields: sectionFields }) => (
          <section
            key={section.key}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <h3 className="text-base font-semibold text-[#1e3a5f]">{section.title}</h3>
            {section.description && (
              <p className="mt-1 text-sm leading-6 text-slate-500">{section.description}</p>
            )}
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {sectionFields.map((field) => {
                const values = formatValue(data[field.name])
                if (values.length === 0) return null

                return (
                  <div
                    key={field.name}
                    className={`rounded-xl border border-slate-100 bg-slate-50/80 p-4 ${
                      field.colSpan === 2 ? 'sm:col-span-2' : ''
                    }`}
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {field.label}
                    </dt>
                    <dd className="mt-2">
                      {values.length > 1 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {values.map((value, index) => (
                            <span
                              key={`${field.name}-${index}`}
                              className="rounded-md border border-[#1e3a5f]/10 bg-white px-2.5 py-1 text-xs font-medium text-[#1e3a5f]"
                            >
                              {value}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="whitespace-pre-line text-sm leading-6 text-slate-800">
                          {values[0]}
                        </p>
                      )}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        ))}

        {ungroupedFields.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="text-base font-semibold text-[#1e3a5f]">Additional information</h3>
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ungroupedFields.map((field) => {
                const values = formatValue(data[field.name])
                if (values.length === 0) return null
                return (
                  <div key={field.name} className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {field.label}
                    </dt>
                    <dd className="mt-2 text-sm leading-6 text-slate-800">
                      {values.join(', ')}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </section>
        )}
      </div>
    </section>
  )
}
