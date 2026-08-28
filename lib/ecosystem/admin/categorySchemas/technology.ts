import type { CategorySchema } from '../categoryFieldRegistry'

export const technologyCategorySchema: CategorySchema = {
  slug: 'technology-partners',
  label: 'Technology Partners',
  sections: [
    { key: 'solutions', title: 'Solutions & Integration' },
  ],
  fields: [
    {
      name: 'solutions',
      label: 'Solutions',
      type: 'multiselect',
      section: 'solutions',
      required: true,
      options: ['CRM', 'Automation', 'Analytics', 'AI', 'Marketplace', 'Property Tech', 'Payments', 'Identity/KYC', 'Mapping/GIS', 'Cloud/Infra'],
      colSpan: 2,
    },
    {
      name: 'integrationType',
      label: 'Integration or Product Type',
      type: 'text',
      section: 'solutions',
      placeholder: 'e.g., API integration, SaaS platform, SDK',
      colSpan: 2,
    },
  ],
}
