import { developerImportAdapter } from '@/lib/imports/adapters/developer/adapter'
import { projectImportAdapter } from '@/lib/imports/adapters/project/adapter'
import { ecosystemPartnerImportAdapter } from '@/lib/imports/adapters/ecosystem-partner/adapter'

describe('universal entity adapters', () => {
  it('normalizes developers from external aliases', () => {
    const normalized = developerImportAdapter.normalize({ raw: { company_name: 'Acme Homes', country: 'India', website_url: 'https://acme.example' }, sourcePath: null, mappings: [] })
    const mapped = developerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.canonical).toMatchObject({ name: 'Acme Homes', countryCode: 'INDIA', countryIso2: 'IN', website: 'https://acme.example' })
  })

  it('normalizes developers from spreadsheet-style headers without using another entity adapter', () => {
    const normalized = developerImportAdapter.normalize({ raw: { 'Developer Name': 'Acme Homes', 'Country Code': 'AE' }, sourcePath: null, mappings: [] })
    const mapped = developerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: developerImportAdapter.suggestMappings({ fields: ['Developer Name', 'Country Code'] }) })
    expect(mapped.canonical?.name).toBe('Acme Homes')
    expect(mapped.errors).toEqual([])
  })

  it('accepts human-formatted CSV headers with spaces', () => {
    const normalized = developerImportAdapter.normalize({ raw: { 'Developer  Name': 'Shivalik Group', City: 'Ahmedabad', State: 'Gujarat', Country: 'India', 'Short Description': 'Green developments', 'Full Description': 'Detailed description', Website: 'https://shivalik.example', Email: 'INFO@SHIVALIK.EXAMPLE', Phone: '91 79 4020 0000', Address: 'Ahmedabad', 'Meta Title': 'Shivalik title', 'Meta Description': 'Shivalik description', 'Meta Keywords': 'shivalik, ahmedabad', 'Duplicate Check': 'Unique' }, sourcePath: null, mappings: [] })
    const mapped = developerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.canonical).toMatchObject({ name: 'Shivalik Group', city: 'Ahmedabad', countryIso2: 'IN', website: 'https://shivalik.example', description: 'Detailed description', email: 'info@shivalik.example', phone: '91 79 4020 0000', address: 'Ahmedabad', metaTitle: 'Shivalik title', metaDescription: 'Shivalik description', metaKeywords: 'shivalik, ahmedabad', sourceState: 'Gujarat', sourceDuplicateCheck: 'Unique' })
  })

  it('normalizes project prices and requires a developer relation', () => {
    const normalized = projectImportAdapter.normalize({ raw: { project_name: 'Harbour View', developer_name: 'Acme Homes', starting_price: '₹1.85 Cr', city_name: 'Mumbai' }, sourcePath: null, mappings: [] })
    const mapped = projectImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.canonical).toMatchObject({ name: 'Harbour View', developerName: 'Acme Homes', startingPrice: 18500000 })
    expect(projectImportAdapter.resolveRelations({ canonical: mapped.canonical!, raw: {} }).ready).toBe(true)
  })

  it('preserves unmapped ecosystem fields as category data', () => {
    const normalized = ecosystemPartnerImportAdapter.normalize({ raw: { company_name: 'Legal Co', category: 'legal-documentation', license_number: 'LIC-1', contact_email: 'INFO@LEGAL.EXAMPLE' }, sourcePath: null, mappings: [] })
    const mapped = ecosystemPartnerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.canonical).toMatchObject({ name: 'Legal Co', categorySlug: 'legal-documentation', contactEmail: 'info@legal.example', categoryData: { license_number: 'LIC-1' } })
  })

  it('maps spreadsheet home-loan fields into category data', () => {
    const normalized = ecosystemPartnerImportAdapter.normalize({
      raw: {
        'Business Name': 'State Bank of India (SBI)',
        'Years of Experience': '71 Years (Est. 1955)',
        'Loan Types': 'Regular Home Loan; Balance Transfer; NRI Loan',
        'Interest Rate Min (%)': '8.5',
        'Interest Rate Max (%)': '9.85',
        'Processing Fee': '0.35% of loan amount',
        'RBI Registration': 'RBI Registered Scheduled Public Sector Bank',
      },
      sourcePath: null,
      mappings: [],
    })
    const mapped = ecosystemPartnerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })

    expect(mapped.canonical).toMatchObject({
      name: 'State Bank of India (SBI)',
      yearsExperience: 71,
      experienceDisplay: '71 Years (Est. 1955)',
      categoryData: {
        loanTypes: ['Regular Home Loan', 'Balance Transfer', 'NRI Loan'],
        interestRateMin: 8.5,
        interestRateMax: 9.85,
        processingFee: '0.35% of loan amount',
        rbiRegistration: 'RBI Registered Scheduled Public Sector Bank',
      },
    })
  })
})
