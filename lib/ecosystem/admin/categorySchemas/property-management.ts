import type { CategorySchema } from '../categoryFieldRegistry'

export const propertyManagementCategorySchema: CategorySchema = {
  slug: 'property-management',
  label: 'Property Management',
  sections: [
    { key: 'management-details', title: 'Management Details' },
  ],
  fields: [
    {
      name: 'unitsManagedDisplay',
      label: 'Units Managed',
      type: 'text',
      section: 'management-details',
      placeholder: 'e.g., 2,000+ properties',
      helpText: 'Free-text representation. Values like "500+ residential units" are valid.',
    },
    {
      name: 'feeStructure',
      label: 'Fee Structure',
      type: 'textarea',
      section: 'management-details',
      placeholder: 'Describe your fee model — percentage, fixed, hybrid...',
      colSpan: 2,
    },
  ],
}
