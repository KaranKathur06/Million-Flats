import { developerImportAdapter } from '@/lib/imports/adapters/developer/adapter'
import { projectImportAdapter } from '@/lib/imports/adapters/project/adapter'
import { ecosystemPartnerImportAdapter } from '@/lib/imports/adapters/ecosystem-partner/adapter'

describe('universal entity adapters', () => {
  it('normalizes developers from external aliases', () => {
    const normalized = developerImportAdapter.normalize({ raw: { company_name: 'Acme Homes', country: 'India', website_url: 'https://acme.example' }, sourcePath: null, mappings: [] })
    const mapped = developerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.canonical).toMatchObject({ name: 'Acme Homes', countryCode: 'INDIA', countryIso2: 'IN', website: 'https://acme.example' })
  })

  it('accepts human-formatted CSV headers with spaces', () => {
    const normalized = developerImportAdapter.normalize({ raw: { 'Developer  Name': 'Shivalik Group', City: 'Ahmedabad', Country: 'India', 'Short Description': 'Green developments', Website: 'https://shivalik.example' }, sourcePath: null, mappings: [] })
    const mapped = developerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.canonical).toMatchObject({ name: 'Shivalik Group', city: 'Ahmedabad', countryIso2: 'IN', website: 'https://shivalik.example' })
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
})
