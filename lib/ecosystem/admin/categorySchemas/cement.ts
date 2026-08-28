import type { CategorySchema } from '../categoryFieldRegistry'

export const cementCategorySchema: CategorySchema = {
  slug: 'cement-structural',
  label: 'Cement & Structural Solutions',
  sections: [
    { key: 'materials-delivery', title: 'Materials & Delivery' },
  ],
  fields: [
    {
      name: 'materials',
      label: 'Materials',
      type: 'multiselect',
      section: 'materials-delivery',
      required: true,
      options: ['Cement', 'Steel', 'Bricks', 'Blocks', 'Concrete', 'Ready-mix', 'Admixtures', 'Waterproofing'],
      colSpan: 2,
    },
    {
      name: 'deliveryCapability',
      label: 'Delivery Capability',
      type: 'textarea',
      section: 'materials-delivery',
      placeholder: 'Describe delivery coverage, vehicle types, site delivery capabilities...',
      helpText: 'Include logistics details, minimum order quantities, and delivery radius.',
      colSpan: 2,
    },
  ],
}
