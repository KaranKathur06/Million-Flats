import type { CategorySchema } from '../categoryFieldRegistry'

export const vastuCategorySchema: CategorySchema = {
  slug: 'vastu-feng-shui',
  label: 'Vastu / Feng Shui Consultants',
  sections: [
    { key: 'consultation', title: 'Consultation' },
  ],
  fields: [
    {
      name: 'consultationModes',
      label: 'Consultation Modes',
      type: 'multiselect',
      section: 'consultation',
      required: true,
      options: ['On-site', 'Online', 'Hybrid', 'Phone', 'Video Call'],
      colSpan: 2,
    },
    {
      name: 'philosophy',
      label: 'Approach / Philosophy',
      type: 'textarea',
      section: 'consultation',
      placeholder: 'Describe your approach, methodology, and guiding philosophy...',
      colSpan: 2,
    },
  ],
}
