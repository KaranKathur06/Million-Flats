import type { CategorySchema } from '../categoryFieldRegistry'

export const hardwareCategorySchema: CategorySchema = {
  slug: 'hardware-architectural-fittings',
  label: 'Hardware & Architectural Fittings',
  sections: [
    { key: 'product-info', title: 'Product Information' },
  ],
  fields: [
    {
      name: 'productCategories',
      label: 'Product Categories',
      type: 'multiselect',
      section: 'product-info',
      required: true,
      options: ['Door Hardware', 'Kitchen Hardware', 'Bathroom Fittings', 'Wardrobe Systems', 'Locks & Security', 'Glass Fittings', 'Sliding Systems', 'Commercial Hardware'],
      colSpan: 2,
    },
    {
      name: 'supportedBrands',
      label: 'Supported Brands',
      type: 'tags',
      section: 'product-info',
      placeholder: 'Add brand name...',
      helpText: 'Add brands individually. Press Enter to add.',
      colSpan: 2,
    },
  ],
}
