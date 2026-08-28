import type { CategorySchema } from '../categoryFieldRegistry'

export const homeLoansCategorySchema: CategorySchema = {
  slug: 'home-loans-finance',
  label: 'Home Loans & Finance',
  sections: [
    { key: 'loan-details', title: 'Loan & Finance Details', description: 'Loan products, rates, and regulatory information.' },
  ],
  fields: [
    {
      name: 'loanTypes',
      label: 'Loan Types',
      type: 'multiselect',
      section: 'loan-details',
      required: true,
      options: ['Home Loan', 'Loan Against Property', 'Balance Transfer', 'NRI Loan', 'Construction Loan', 'Plot Loan', 'Top-up Loan'],
      helpText: 'Select all loan products offered.',
      colSpan: 2,
    },
    {
      name: 'interestRateMin',
      label: 'Interest Rate Min (%)',
      type: 'number',
      section: 'loan-details',
      placeholder: 'e.g., 8.25',
      validation: { min: 0, max: 30 },
    },
    {
      name: 'interestRateMax',
      label: 'Interest Rate Max (%)',
      type: 'number',
      section: 'loan-details',
      placeholder: 'e.g., 12.50',
      validation: { min: 0, max: 30 },
    },
    {
      name: 'processingFee',
      label: 'Processing Fee',
      type: 'text',
      section: 'loan-details',
      placeholder: 'e.g., 0.5% - 1% of loan amount',
      helpText: 'Can be a percentage range or fixed amount.',
      colSpan: 2,
    },
    {
      name: 'rbiRegistration',
      label: 'RBI Registration',
      type: 'text',
      section: 'loan-details',
      placeholder: 'RBI registration number (if applicable)',
      helpText: 'NBFC/HFC registration number if regulated by RBI.',
    },
  ],
}
