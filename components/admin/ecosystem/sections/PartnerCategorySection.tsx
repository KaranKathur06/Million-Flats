'use client'

import { getCategorySchemaBySlug } from '@/lib/ecosystem/admin/categoryFieldRegistry'
import DynamicField from '../fields/DynamicField'

type Props = {
  categorySlug: string
  categoryData: Record<string, unknown>
  onFieldChange: (key: string, value: unknown) => void
}

export default function PartnerCategorySection({ categorySlug, categoryData, onFieldChange }: Props) {
  const schema = getCategorySchemaBySlug(categorySlug)

  if (!schema || schema.fields.length === 0) {
    if (!categorySlug) return null
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
        <p className="text-sm text-white/30">Select a category to see category-specific fields.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-accent-yellow/10 bg-accent-yellow/[0.02] p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold text-white">{schema.label} Fields</h2>
        <span className="rounded bg-accent-yellow/15 px-2 py-0.5 text-[10px] font-semibold text-accent-yellow">
          CATEGORY
        </span>
      </div>

      {schema.sections.map((section) => {
        const sectionFields = schema.fields.filter((f) => f.section === section.key)
        if (sectionFields.length === 0) return null

        return (
          <div key={section.key} className="mt-5">
            <h3 className="text-sm font-semibold text-white/70">{section.title}</h3>
            {section.description && (
              <p className="mt-0.5 text-xs text-white/30">{section.description}</p>
            )}
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {sectionFields.map((field) => (
                <DynamicField
                  key={field.name}
                  field={field}
                  value={categoryData[field.name]}
                  onChange={onFieldChange}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
