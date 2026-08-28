import type { CategorySchema } from '../categoryFieldRegistry'

export const smartHomeCategorySchema: CategorySchema = {
  slug: 'smart-home-automation',
  label: 'Smart Home & Automation',
  sections: [
    { key: 'smart-home-details', title: 'Smart Home & Automation Details' },
  ],
  fields: [
    {
      name: 'supportedBrands',
      label: 'Supported Brands',
      type: 'multiselect',
      section: 'smart-home-details',
      required: true,
      options: ['Philips Hue', 'Google', 'Amazon Alexa', 'Apple HomeKit', 'Sonoff', 'Lutron', 'Schneider', 'Hikvision', 'Control4', 'Crestron', 'KNX'],
      colSpan: 2,
    },
    {
      name: 'amcAvailable',
      label: 'AMC Available?',
      type: 'boolean-select',
      section: 'smart-home-details',
      options: ['Yes', 'No', 'Available on request'],
      helpText: 'Annual Maintenance Contract availability.',
    },
  ],
}
