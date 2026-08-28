import type { CategorySchema } from '../categoryFieldRegistry'

export const tilesCategorySchema: CategorySchema = {
  slug: 'tiles-surface-finishing',
  label: 'Tiles & Surface Finishing',
  sections: [
    { key: 'materials-brands', title: 'Materials & Brands' },
  ],
  fields: [
    {
      name: 'materials',
      label: 'Materials',
      type: 'multiselect',
      section: 'materials-brands',
      required: true,
      options: ['Tiles', 'Stone', 'Marble', 'Granite', 'Wood', 'Vinyl', 'Porcelain', 'Ceramic', 'Mosaic', 'Terrazzo'],
      colSpan: 2,
    },
    {
      name: 'supportedBrands',
      label: 'Supported Brands',
      type: 'tags',
      section: 'materials-brands',
      placeholder: 'Add brand name...',
      helpText: 'Add brands individually. Press Enter to add.',
      colSpan: 2,
    },
  ],
}
