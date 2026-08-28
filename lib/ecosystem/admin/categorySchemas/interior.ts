import type { CategorySchema } from '../categoryFieldRegistry'

export const interiorCategorySchema: CategorySchema = {
  slug: 'interior-design-renovation',
  label: 'Interior Design & Renovation',
  sections: [
    { key: 'portfolio', title: 'Portfolio', description: 'Links to portfolio projects and galleries.' },
  ],
  fields: [
    {
      name: 'portfolioLinks',
      label: 'Portfolio Links',
      type: 'tags',
      section: 'portfolio',
      placeholder: 'https://example.com/project',
      helpText: 'Add individual portfolio/project URLs. Each link is validated.',
      colSpan: 2,
    },
  ],
}
