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

  it('normalizes project prices and requires a developer relation', async () => {
    const normalized = projectImportAdapter.normalize({ raw: { project_name: 'Harbour View', developer_name: 'Acme Homes', starting_price: '₹1.85 Cr', city_name: 'Mumbai' }, sourcePath: null, mappings: [] })
    const mapped = projectImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
    expect(mapped.canonical).toMatchObject({ name: 'Harbour View', developerName: 'Acme Homes', startingPrice: 18500000 })
    const relations = await projectImportAdapter.resolveRelations({ canonical: mapped.canonical!, raw: {} })
    expect(relations.ready).toBe(true)
  })

  it('infers India for Chennai projects when the source omits country', () => {
    const normalized = projectImportAdapter.normalize({
      raw: { name: 'Chennai Heights', developer: 'Example Homes', city: 'Chennai' },
      sourcePath: null,
      mappings: [],
    })

    expect(normalized.normalized).toMatchObject({ countryIso2: 'IN', city: 'Chennai' })
  })

  it('uses INR as an India fallback when country and city are missing', () => {
    const normalized = projectImportAdapter.normalize({
      raw: { name: 'India Project', developer: 'Example Homes', priceCurrency: 'INR' },
      sourcePath: null,
      mappings: [],
    })

    expect(normalized.normalized).toMatchObject({ countryIso2: 'IN' })
  })

  it('maps Dubai spreadsheet title and nested header aliases', () => {
    const normalized = projectImportAdapter.normalize({
      raw: {
        title: 'Virella at The Valley',
        'developer/name': 'Emaar Properties',
        'location/fullName': 'Dubai,The Valley',
        startingPrice: '3500000',
      },
      sourcePath: null,
      mappings: projectImportAdapter.suggestMappings({ fields: ['title', 'developer/name', 'location/fullName', 'startingPrice'] }),
    })

    expect(normalized.normalized).toMatchObject({
      name: 'Virella at The Valley',
      developerName: 'Emaar Properties',
      countryIso2: 'AE',
      city: 'Dubai',
      community: 'The Valley',
    })
  })

  it('resolves a project developer name to its database relationship', async () => {
    const canonical = {
      name: 'Brigade Stellaris',
      developerName: 'brigade',
    }
    const relations = await projectImportAdapter.resolveRelations({
      canonical,
      raw: {},
      db: {
        developer: {
          findUnique: async () => null,
          findFirst: async () => ({ id: 'developer-1', name: 'Brigade' }),
        },
      },
    })

    expect(relations.ready).toBe(true)
    expect(canonical).toMatchObject({ developerId: 'developer-1', developerName: 'Brigade' })
  })

  it('blocks projects with no developer relationship', async () => {
    const relations = await projectImportAdapter.resolveRelations({ canonical: { name: 'Unknown Project' }, raw: {} })

    expect(relations.ready).toBe(false)
    expect(relations.errors).toEqual(['Developer relationship is required.'])
  })

  it('allows a named developer to be provisioned during commit', async () => {
    let createdData: Record<string, unknown> | null = null
    const canonical = {
      name: 'Vishranthi Tejas',
      slug: 'vishranthi-tejas',
      developerName: 'Vishranthi Homes',
      countryIso2: 'IN',
      city: 'Chennai',
    }
    const db = {
      developer: {
        findUnique: async () => null,
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdData = data
          return { id: 'developer-2', name: 'Vishranthi Homes', slug: 'vishranthi-homes' }
        },
      },
      project: {
        findUnique: async () => null,
        create: async () => ({ id: 'project-1' }),
      },
    }

    const result = await projectImportAdapter.commit({ canonical, operation: 'CREATE', sourceRecordId: 'row-1', db })

    expect(createdData).toMatchObject({ name: 'Vishranthi Homes', countryCode: 'INDIA', countryIso2: 'IN' })
    expect(result.status).toBe('created')
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

  it('uses CSV-aligned legal specializations in the legal category schema', () => {
    const options = require('@/lib/ecosystem/admin/categorySchemas/legal').legalCategorySchema.fields.find((field: any) => field.name === 'specialization')?.options ?? []

    expect(options).toEqual(expect.arrayContaining([
      'Real Estate Title Verification',
      'Commercial Disputes',
      'Arbitration',
      'Corporate Advisory',
      'Real Estate Conveyance',
      'Dispute Resolution',
    ]))
    expect(options).not.toEqual(expect.arrayContaining(['Due Diligence', 'RERA', 'Litigation Support']))
  })

  it('keeps ecosystem partner option sets aligned across category schemas and registration config', () => {
    const schemaCases = {
      'home-loans-finance': ['Home Loan', 'Loan Against Property', 'Balance Transfer', 'NRI Loan', 'Construction Loan', 'Plot Loan', 'Top-up Loan'],
      'legal-documentation': ['Real Estate Title Verification', 'Commercial Disputes', 'Arbitration', 'Real Estate Conveyance', 'Property Due Diligence', 'Corporate Advisory', 'Commercial Contracts', 'RERA Compliance', 'Dispute Resolution', 'Real Estate Litigation'],
      'property-insurance': ['Home Insurance', 'Fire & Perils', 'Contents Cover', 'Landlord Insurance', 'Earthquake Cover', 'Flood Cover', 'Builder Risk'],
      'packers-movers': ['Local', 'Inter-city', 'International', 'Storage', 'Office', 'Vehicle Transport', 'Warehousing'],
      'smart-home-automation': ['Philips Hue', 'Google', 'Amazon Alexa', 'Apple HomeKit', 'Sonoff', 'Lutron', 'Schneider', 'Hikvision', 'Control4', 'Crestron', 'KNX'],
      'technology-partners': ['CRM', 'Automation', 'Analytics', 'AI', 'Marketplace', 'Property Tech', 'Payments', 'Identity/KYC', 'Mapping/GIS', 'Cloud/Infra'],
      'tiles-surface-finishing': ['Tiles', 'Stone', 'Marble', 'Granite', 'Wood', 'Vinyl', 'Porcelain', 'Ceramic', 'Mosaic', 'Terrazzo'],
      'hardware-architectural-fittings': ['Door Hardware', 'Kitchen Hardware', 'Bathroom Fittings', 'Wardrobe Systems', 'Locks & Security', 'Glass Fittings', 'Sliding Systems', 'Commercial Hardware'],
      'cement-structural': ['Cement', 'Steel', 'Bricks', 'Blocks', 'Concrete', 'Ready-mix', 'Admixtures', 'Waterproofing'],
    }

    const config = require('@/lib/ecosystem/ecosystemCategoryConfig')
    Object.entries(schemaCases).forEach(([slug, expected]) => {
      const configEntry = config.ECOSYSTEM_REGISTRATION_CONFIG[slug]
      expect(configEntry).toBeDefined()
      if (!configEntry) return
      const field = configEntry.extraFields.find((item: any) => Array.isArray(item.options))
      expect(field).toBeDefined()
      if (!field) return
      expect(field.options).toEqual(expect.arrayContaining(expected.slice(0, 3)))
      expect(field.options).toEqual(expect.arrayContaining(expected.slice(-3)))
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
    ['hardware-architectural-fittings', { 'Product Categories': 'Digital Locks, Glass Hardware', 'Supported Brands': 'Godrej, Ozone' }, { productCategories: ['Digital Locks', 'Glass Hardware'], supportedBrands: ['Godrej', 'Ozone'] }],
    ['cement-structural', { Materials: 'Ordinary Portland Cement (OPC 53), Ready Mix Concrete (RMC)', 'Delivery Capability': 'Nationwide multi-modal logistics with 100+ grinding units.' }, { materials: ['Ordinary Portland Cement (OPC 53)', 'Ready Mix Concrete (RMC)'], deliveryCapability: 'Nationwide multi-modal logistics with 100+ grinding units.' }],
  ] as const
  categoryCases.forEach(([categorySlug, rawFields, expected]) => {
    it(`maps ${categorySlug} category fields from CSV labels`, () => {
      const normalized = ecosystemPartnerImportAdapter.normalize({ raw: { 'Business Name': 'Category Partner', categorySlug, ...rawFields }, sourcePath: null, mappings: [] })
      const mapped = ecosystemPartnerImportAdapter.mapCanonical({ raw: {}, normalized: normalized.normalized, mappings: [] })
      expect(mapped.canonical?.categoryData).toMatchObject(expected)
    })
  })

  it('normalizes technology partner CSV rows with founded-year and years-experience fields correctly', () => {
    const normalized = ecosystemPartnerImportAdapter.normalize({
      raw: {
        'Business Name': 'Searce Inc. / Searce Technologies',
        'Contact Person': 'Hardik Parekh (Founder & CEO)',
        Email: 'sales@searce.com',
        Phone: '+91-20-6725-6600',
        Website: 'https://www.searce.com',
        'Years of Experience': 'Founded 2004 (22 years)',
        'Pricing Range': '$50 - $99 / hr',
        'Business Description': 'Searce is a modern technology consulting firm.',
        'Service Areas': 'Cloud Migration, Data Engineering',
        Solutions: 'GenAI & ML Workflows, Enterprise Data Lakehouse',
        'Integration or Product Type': 'Google Cloud Premier Partner, AWS Advanced Tier Services Partner',
        categorySlug: 'technology-partners',
      },
      sourcePath: null,
      mappings: [],
    })

    expect(normalized.normalized.yearsExperience).toBe(22)
    expect(normalized.normalized.partnerSince).toBe(2004)
    expect(normalized.normalized.locationCoverage).toBe('Cloud Migration, Data Engineering')
    expect(normalized.normalized.categoryData).toMatchObject({
      solutions: ['GenAI & ML Workflows', 'Enterprise Data Lakehouse'],
      integrationType: 'Google Cloud Premier Partner, AWS Advanced Tier Services Partner',
    })
  })
})
