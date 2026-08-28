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
    expect(mapped.canonical).toMatchObject({ name: 'Legal Co', categorySlug: 'legal-documentation', contactEmail: 'info@legal.example', categoryData: { licenseNumber: 'LIC-1' } })
  })

  it('maps spreadsheet home-loan fields into category data', () => {
    const normalized = ecosystemPartnerImportAdapter.normalize({
      raw: {
        'Business Name': 'State Bank of India (SBI)',
        categorySlug: 'home-loans-finance',
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

  it('maps Legal & Documentation CSV fields into the category schema', () => {
    const normalized = ecosystemPartnerImportAdapter.normalize({
      raw: {
        'Business Name': 'Astraea Legal Advocates & Solicitors',
        categorySlug: 'legal-documentation',
        'Contact Person': 'Rishi Anand',
        Email: 'delhi@astraealegal.com',
        Phone: '+91 11 4100 5600',
        Website: 'https://www.astraealegal.com',
        'Years of Experience': '14+ Years',
        'Pricing Range': 'Mid-Range (₹15,000 - ₹1,20,000)',
        'Business Description': 'Full-service law firm with extensive experience.',
        'Service Areas': 'New Delhi, Mumbai, Chandigarh, Jaipur',
        'License Number': 'D/1090/2008 (Bar Council of Delhi)',
        Specialization: 'Real Estate Title Verification, Commercial Disputes, Arbitration',
        'Due Diligence': 'Yes (Property Search Reports & Title Clearance Audits)',
        'Agreement Drafting': 'Yes (Builder-Buyer Agreements, Collaboration Deeds, Leases)',
        Registration: 'Yes (Sub-Registrar Offices in Delhi NCR)',
        RERA: 'Yes (RERA Complaints & Developer Advisory)',
        'Litigation Support': 'Yes (Supreme Court, Delhi High Court, District Courts)',
        'Court Registration': 'Yes (Delhi High Court & Supreme Court)',
      },
      sourcePath: null,
      mappings: [],
    })
    const mapped = ecosystemPartnerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })

    expect(mapped.canonical).toMatchObject({
      name: 'Astraea Legal Advocates & Solicitors',
      contactPerson: 'Rishi Anand',
      description: 'Full-service law firm with extensive experience.',
      categoryData: {
        licenseNumber: 'D/1090/2008 (Bar Council of Delhi)',
        courtRegistration: 'Yes (Delhi High Court & Supreme Court)',
        specialization: ['Real Estate Title Verification', 'Commercial Disputes', 'Arbitration'],
        dueDiligence: 'Yes (Property Search Reports & Title Clearance Audits)',
        agreementDrafting: 'Yes (Builder-Buyer Agreements, Collaboration Deeds, Leases)',
        registration: 'Yes (Sub-Registrar Offices in Delhi NCR)',
        rera: 'Yes (RERA Complaints & Developer Advisory)',
        litigationSupport: 'Yes (Supreme Court, Delhi High Court, District Courts)',
      },
    })
  })

  const categoryCases = [
    ['smart-home-automation', { 'Supported Brands': 'Control4, Tuya, Zigbee', 'AMC Available?': 'Yes' }, { supportedBrands: ['Control4', 'Tuya', 'Zigbee'], amcAvailable: 'Yes' }],
    ['interior-design-renovation', { 'Portfolio Links': 'https://example.com/portfolio' }, { portfolioLinks: ['https://example.com/portfolio'] }],
    ['packers-movers', { 'Service Types': 'Household Shifting; Office Relocation', 'Fleet Details': '100 container trucks' }, { serviceTypes: ['Household Shifting', 'Office Relocation'], fleetDetails: '100 container trucks' }],
    ['property-insurance', { Products: 'Home Insurance, Fire Cover', 'IRDAI Registration Number': 'IRDAI Reg. No. 113' }, { products: ['Home Insurance', 'Fire Cover'], irdaiRegistrationNumber: 'IRDAI Reg. No. 113' }],
    ['property-management', { 'Units Managed': '2,000+ properties', 'Fee Structure': '8% monthly management fee' }, { unitsManagedDisplay: '2,000+ properties', feeStructure: '8% monthly management fee' }],
    ['technology-partners', { Solutions: 'Cloud Migration, AI Solutions', 'Integration or Product Type': 'AWS Premier Partner' }, { solutions: ['Cloud Migration', 'AI Solutions'], integrationType: 'AWS Premier Partner' }],
    ['tiles-surface-finishing', { Materials: 'Porcelain Tiles, Quartz Stone', 'Supported Brands': 'Kajaria, Somany' }, { materials: ['Porcelain Tiles', 'Quartz Stone'], supportedBrands: ['Kajaria', 'Somany'] }],
    ['vastu-feng-shui', { 'Consultation Modes': 'Online, On-Site Inspection', 'Your Approach / Philosophy': 'Scientific space planning' }, { consultationModes: ['Online', 'On-Site Inspection'], philosophy: 'Scientific space planning' }],
  ] as const
  categoryCases.forEach(([categorySlug, rawFields, expected]) => {
    it(`maps ${categorySlug} category fields from CSV labels`, () => {
      const normalized = ecosystemPartnerImportAdapter.normalize({ raw: { 'Business Name': 'Category Partner', categorySlug, ...rawFields }, sourcePath: null, mappings: [] })
      const mapped = ecosystemPartnerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
      expect(mapped.canonical?.categoryData).toMatchObject(expected)
    })
  })
})
