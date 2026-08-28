import type { CategorySchema } from '../categoryFieldRegistry'

export const packersCategorySchema: CategorySchema = {
  slug: 'packers-movers',
  label: 'Packers & Movers',
  sections: [
    { key: 'moving-services', title: 'Moving Services' },
    { key: 'fleet', title: 'Fleet Information' },
  ],
  fields: [
    {
      name: 'serviceTypes',
      label: 'Service Types',
      type: 'multiselect',
      section: 'moving-services',
      required: true,
      options: ['Local', 'Inter-city', 'International', 'Storage', 'Office', 'Vehicle Transport', 'Warehousing'],
      colSpan: 2,
    },
    {
      name: 'fleetDetails',
      label: 'Fleet Details',
      type: 'textarea',
      section: 'fleet',
      placeholder: 'Describe fleet size, vehicle types, capacity...',
      colSpan: 2,
    },
  ],
}
