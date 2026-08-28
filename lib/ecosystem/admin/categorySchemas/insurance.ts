import type { CategorySchema } from '../categoryFieldRegistry'

export const insuranceCategorySchema: CategorySchema = {
  slug: 'property-insurance',
  label: 'Property Insurance',
  sections: [
    { key: 'insurance-details', title: 'Insurance Details' },
  ],
  fields: [
    {
      name: 'products',
      label: 'Products',
      type: 'multiselect',
      section: 'insurance-details',
      required: true,
      options: ['Home Insurance', 'Fire & Perils', 'Contents Cover', 'Landlord Insurance', 'Earthquake Cover', 'Flood Cover', 'Builder Risk'],
      helpText: 'Insurance products offered.',
      colSpan: 2,
    },
    {
      name: 'irdaiRegistrationNumber',
      label: 'IRDAI Registration Number',
      type: 'text',
      section: 'insurance-details',
      placeholder: 'IRDAI license/registration number',
      helpText: 'Insurance Regulatory and Development Authority registration.',
    },
  ],
}
